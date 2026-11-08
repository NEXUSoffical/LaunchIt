use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};
use anchor_spl::token_2022::{self, TransferChecked};
use crate::curve::CurveMath;
use crate::errors::LaunchpadError;
use crate::state::{
    BondingCurve, OrbitBurnEvent, OrbitLaunchConfig, TradeEvent,
    BONDING_CURVE_SEED, CONFIG_SEED, CURVE_VAULT_SEED,
};

#[derive(Accounts)]
pub struct Sell<'info> {
    #[account(mut)]
    pub seller: Signer<'info>,

    #[account(
        mut,
        seeds = [CONFIG_SEED],
        bump = config.bump
    )]
    pub config: Account<'info, OrbitLaunchConfig>,

    /// CHECK: Validated against config.treasury
    #[account(
        mut,
        constraint = treasury.key() == config.treasury @ LaunchpadError::Unauthorized
    )]
    pub treasury: AccountInfo<'info>,

    /// CHECK: Validated against config.burn_address
    #[account(
        mut,
        constraint = burn_address.key() == config.burn_address @ LaunchpadError::Unauthorized
    )]
    pub burn_address: AccountInfo<'info>,

    pub mint: Box<InterfaceAccount<'info, Mint>>,

    #[account(
        mut,
        seeds = [BONDING_CURVE_SEED, mint.key().as_ref()],
        bump = bonding_curve.bump
    )]
    pub bonding_curve: Account<'info, BondingCurve>,

    #[account(
        mut,
        token::mint = mint,
        token::authority = bonding_curve,
        token::token_program = token_program,
        seeds = [CURVE_VAULT_SEED, mint.key().as_ref()],
        bump
    )]
    pub curve_vault: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut,
        token::mint = mint,
        token::authority = seller,
        token::token_program = token_program
    )]
    pub seller_token_account: Box<InterfaceAccount<'info, TokenAccount>>,

    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<Sell>, token_amount_in: u64, min_orbit_out: u64) -> Result<()> {
    let bonding_curve = &mut ctx.accounts.bonding_curve;
    require!(!bonding_curve.complete, LaunchpadError::BondingCurveComplete);

    let config = &mut ctx.accounts.config;

    // 1. Calculate $ORBIT gross output from constant product curve
    let orbit_gross_out = CurveMath::calculate_sell_orbit_out(
        bonding_curve.virtual_orbit_reserves,
        bonding_curve.virtual_token_reserves,
        bonding_curve.real_orbit_reserves,
        token_amount_in,
    )?;

    // 2. Calculate protocol fee & net $ORBIT to seller
    let total_fee = CurveMath::calculate_fee(orbit_gross_out, config.fee_basis_points)?;
    let orbit_net_out = orbit_gross_out
        .checked_sub(total_fee)
        .ok_or(LaunchpadError::MathOverflow)?;

    // 3. Slippage check
    require!(orbit_net_out >= min_orbit_out, LaunchpadError::SlippageExceeded);

    // 4. Transfer tokens from seller ATA to curve vault
    token_2022::transfer_checked(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            TransferChecked {
                from: ctx.accounts.seller_token_account.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
                to: ctx.accounts.curve_vault.to_account_info(),
                authority: ctx.accounts.seller.to_account_info(),
            },
        ),
        token_amount_in,
        6, // decimals
    )?;

    let clock = Clock::get()?;

    // 5. Split fee: 50% Burned forever 🔥 / 50% Protocol Treasury
    let (burn_amt, treasury_amt) = CurveMath::calculate_fee_split(
        total_fee,
        config.burn_split_basis_points,
    )?;

    // Transfer $ORBIT lamports from bonding curve PDA to seller, burn address, and treasury
    **bonding_curve.to_account_info().try_borrow_mut_lamports()? = bonding_curve
        .to_account_info()
        .lamports()
        .checked_sub(orbit_gross_out)
        .ok_or(LaunchpadError::MathOverflow)?;

    **ctx.accounts.seller.try_borrow_mut_lamports()? = ctx
        .accounts
        .seller
        .lamports()
        .checked_add(orbit_net_out)
        .ok_or(LaunchpadError::MathOverflow)?;

    if burn_amt > 0 {
        **ctx.accounts.burn_address.try_borrow_mut_lamports()? = ctx
            .accounts
            .burn_address
            .lamports()
            .checked_add(burn_amt)
            .ok_or(LaunchpadError::MathOverflow)?;

        config.total_orbit_burned = config
            .total_orbit_burned
            .checked_add(burn_amt)
            .ok_or(LaunchpadError::MathOverflow)?;

        emit!(OrbitBurnEvent {
            amount_burned: burn_amt,
            total_burned_to_date: config.total_orbit_burned,
            reason: "Trade Fee Burn (Sell)".to_string(),
            timestamp: clock.unix_timestamp,
        });
    }

    if treasury_amt > 0 {
        **ctx.accounts.treasury.try_borrow_mut_lamports()? = ctx
            .accounts
            .treasury
            .lamports()
            .checked_add(treasury_amt)
            .ok_or(LaunchpadError::MathOverflow)?;
    }

    // 6. Update curve reserves
    bonding_curve.virtual_orbit_reserves = bonding_curve
        .virtual_orbit_reserves
        .checked_sub(orbit_gross_out)
        .ok_or(LaunchpadError::MathOverflow)?;

    bonding_curve.virtual_token_reserves = bonding_curve
        .virtual_token_reserves
        .checked_add(token_amount_in)
        .ok_or(LaunchpadError::MathOverflow)?;

    bonding_curve.real_orbit_reserves = bonding_curve
        .real_orbit_reserves
        .checked_sub(orbit_gross_out)
        .ok_or(LaunchpadError::MathOverflow)?;

    bonding_curve.real_token_reserves = bonding_curve
        .real_token_reserves
        .checked_add(token_amount_in)
        .ok_or(LaunchpadError::MathOverflow)?;

    emit!(TradeEvent {
        mint: ctx.accounts.mint.key(),
        user: ctx.accounts.seller.key(),
        is_buy: false,
        orbit_amount: orbit_gross_out,
        token_amount: token_amount_in,
        virtual_orbit_reserves: bonding_curve.virtual_orbit_reserves,
        virtual_token_reserves: bonding_curve.virtual_token_reserves,
        real_orbit_reserves: bonding_curve.real_orbit_reserves,
        real_token_reserves: bonding_curve.real_token_reserves,
        fee_treasury: treasury_amt,
        fee_burned: burn_amt,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

