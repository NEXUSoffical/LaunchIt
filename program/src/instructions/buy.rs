use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};
use anchor_spl::token_2022::{self, TransferChecked};
use crate::curve::CurveMath;
use crate::errors::LaunchpadError;
use crate::state::{
    BondingCurve, AchievedOrbitEvent, OrbitBurnEvent, OrbitLaunchConfig, TradeEvent,
    BONDING_CURVE_SEED, CONFIG_SEED, CURVE_VAULT_SEED,
};

#[derive(Accounts)]
pub struct Buy<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,

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
        token::authority = buyer,
        token::token_program = token_program
    )]
    pub buyer_token_account: Box<InterfaceAccount<'info, TokenAccount>>,

    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<Buy>, orbit_amount_in: u64, min_tokens_out: u64) -> Result<()> {
    let bonding_curve = &mut ctx.accounts.bonding_curve;
    require!(!bonding_curve.complete, LaunchpadError::BondingCurveComplete);

    let config = &mut ctx.accounts.config;

    // 1. Calculate platform fee & net $ORBIT
    let total_fee = CurveMath::calculate_fee(orbit_amount_in, config.fee_basis_points)?;
    let net_orbit = orbit_amount_in
        .checked_sub(total_fee)
        .ok_or(LaunchpadError::MathOverflow)?;

    // 2. Calculate tokens received from constant product curve
    let tokens_out = CurveMath::calculate_buy_tokens_out(
        bonding_curve.virtual_orbit_reserves,
        bonding_curve.virtual_token_reserves,
        bonding_curve.real_token_reserves,
        net_orbit,
    )?;

    // 3. Slippage protection check
    require!(
        tokens_out >= min_tokens_out,
        LaunchpadError::SlippageExceeded
    );

    let clock = Clock::get()?;

    // 4. Split fee: 50% Burned forever 🔥 / 50% Protocol Treasury
    let (burn_amt, treasury_amt) = CurveMath::calculate_fee_split(
        total_fee,
        config.burn_split_basis_points,
    )?;

    if burn_amt > 0 {
        transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.buyer.to_account_info(),
                    to: ctx.accounts.burn_address.to_account_info(),
                },
            ),
            burn_amt,
        )?;

        config.total_orbit_burned = config
            .total_orbit_burned
            .checked_add(burn_amt)
            .ok_or(LaunchpadError::MathOverflow)?;

        emit!(OrbitBurnEvent {
            amount_burned: burn_amt,
            total_burned_to_date: config.total_orbit_burned,
            reason: "Trade Fee Burn (Buy)".to_string(),
            timestamp: clock.unix_timestamp,
        });
    }

    if treasury_amt > 0 {
        transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.buyer.to_account_info(),
                    to: ctx.accounts.treasury.to_account_info(),
                },
            ),
            treasury_amt,
        )?;
    }

    // 5. Transfer net $ORBIT from buyer to bonding curve PDA
    transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            Transfer {
                from: ctx.accounts.buyer.to_account_info(),
                to: ctx.accounts.bonding_curve.to_account_info(),
            },
        ),
        net_orbit,
    )?;

    // 6. Transfer tokens from curve vault to buyer ATA
    let mint_key = ctx.accounts.mint.key();
    let curve_bump = bonding_curve.bump;
    let seeds = &[
        BONDING_CURVE_SEED,
        mint_key.as_ref(),
        &[curve_bump],
    ];
    let signer_seeds = &[&seeds[..]];

    token_2022::transfer_checked(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            TransferChecked {
                from: ctx.accounts.curve_vault.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
                to: ctx.accounts.buyer_token_account.to_account_info(),
                authority: ctx.accounts.bonding_curve.to_account_info(),
            },
            signer_seeds,
        ),
        tokens_out,
        6, // decimals
    )?;

    // 7. Update curve state
    bonding_curve.virtual_orbit_reserves = bonding_curve
        .virtual_orbit_reserves
        .checked_add(net_orbit)
        .ok_or(LaunchpadError::MathOverflow)?;

    bonding_curve.virtual_token_reserves = bonding_curve
        .virtual_token_reserves
        .checked_sub(tokens_out)
        .ok_or(LaunchpadError::MathOverflow)?;

    bonding_curve.real_orbit_reserves = bonding_curve
        .real_orbit_reserves
        .checked_add(net_orbit)
        .ok_or(LaunchpadError::MathOverflow)?;

    bonding_curve.real_token_reserves = bonding_curve
        .real_token_reserves
        .checked_sub(tokens_out)
        .ok_or(LaunchpadError::MathOverflow)?;

    // 8. Check graduation condition ("Achieved Orbit" 🪐)
    if bonding_curve.real_orbit_reserves >= config.orbit_graduation_target
        || bonding_curve.real_token_reserves == 0
    {
        bonding_curve.complete = true;
        emit!(AchievedOrbitEvent {
            mint: mint_key,
            total_orbit_raised: bonding_curve.real_orbit_reserves,
            remaining_tokens: bonding_curve.real_token_reserves,
            timestamp: clock.unix_timestamp,
        });
        msg!("🪐 TOKEN ACHIEVED ORBIT! Escaped atmosphere. Ready for AMM permanent liquidity lock.");
    }

    emit!(TradeEvent {
        mint: mint_key,
        user: ctx.accounts.buyer.key(),
        is_buy: true,
        orbit_amount: orbit_amount_in,
        token_amount: tokens_out,
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

