use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};
use anchor_spl::token_2022::{self, TransferChecked};
use crate::curve::CurveMath;
use crate::errors::LaunchpadError;
use crate::state::{
    BondingCurve, LaunchpadConfig, TradeEvent,
    BONDING_CURVE_SEED, CONFIG_SEED, CURVE_VAULT_SEED,
};

#[derive(Accounts)]
pub struct Sell<'info> {
    #[account(mut)]
    pub seller: Signer<'info>,

    #[account(
        seeds = [CONFIG_SEED],
        bump = config.bump
    )]
    pub config: Account<'info, LaunchpadConfig>,

    /// CHECK: Validated against config.fee_recipient
    #[account(
        mut,
        constraint = fee_recipient.key() == config.fee_recipient @ LaunchpadError::Unauthorized
    )]
    pub fee_recipient: AccountInfo<'info>,

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

pub fn handler(ctx: Context<Sell>, token_amount_in: u64, min_sol_out: u64) -> Result<()> {
    let bonding_curve = &mut ctx.accounts.bonding_curve;
    require!(!bonding_curve.complete, LaunchpadError::BondingCurveComplete);

    let config = &ctx.accounts.config;

    // 1. Calculate SOL gross output from constant product curve
    let sol_gross_out = CurveMath::calculate_sell_sol_out(
        bonding_curve.virtual_sol_reserves,
        bonding_curve.virtual_token_reserves,
        bonding_curve.real_sol_reserves,
        token_amount_in,
    )?;

    // 2. Calculate protocol fee & net SOL to seller
    let fee = CurveMath::calculate_fee(sol_gross_out, config.fee_basis_points)?;
    let sol_net_out = sol_gross_out
        .checked_sub(fee)
        .ok_or(LaunchpadError::MathOverflow)?;

    // 3. Slippage check
    require!(sol_net_out >= min_sol_out, LaunchpadError::SlippageExceeded);

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

    // 5. Transfer SOL from bonding curve PDA to seller & fee recipient
    **bonding_curve.to_account_info().try_borrow_mut_lamports()? = bonding_curve
        .to_account_info()
        .lamports()
        .checked_sub(sol_gross_out)
        .ok_or(LaunchpadError::MathOverflow)?;

    **ctx.accounts.seller.try_borrow_mut_lamports()? = ctx
        .accounts
        .seller
        .lamports()
        .checked_add(sol_net_out)
        .ok_or(LaunchpadError::MathOverflow)?;

    if fee > 0 {
        **ctx.accounts.fee_recipient.try_borrow_mut_lamports()? = ctx
            .accounts
            .fee_recipient
            .lamports()
            .checked_add(fee)
            .ok_or(LaunchpadError::MathOverflow)?;
    }

    // 6. Update curve reserves
    bonding_curve.virtual_sol_reserves = bonding_curve
        .virtual_sol_reserves
        .checked_sub(sol_gross_out)
        .ok_or(LaunchpadError::MathOverflow)?;

    bonding_curve.virtual_token_reserves = bonding_curve
        .virtual_token_reserves
        .checked_add(token_amount_in)
        .ok_or(LaunchpadError::MathOverflow)?;

    bonding_curve.real_sol_reserves = bonding_curve
        .real_sol_reserves
        .checked_sub(sol_gross_out)
        .ok_or(LaunchpadError::MathOverflow)?;

    bonding_curve.real_token_reserves = bonding_curve
        .real_token_reserves
        .checked_add(token_amount_in)
        .ok_or(LaunchpadError::MathOverflow)?;

    let clock = Clock::get()?;

    emit!(TradeEvent {
        mint: ctx.accounts.mint.key(),
        user: ctx.accounts.seller.key(),
        is_buy: false,
        sol_amount: sol_gross_out,
        token_amount: token_amount_in,
        virtual_sol_reserves: bonding_curve.virtual_sol_reserves,
        virtual_token_reserves: bonding_curve.virtual_token_reserves,
        real_sol_reserves: bonding_curve.real_sol_reserves,
        real_token_reserves: bonding_curve.real_token_reserves,
        fee_amount: fee,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
