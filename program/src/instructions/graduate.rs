use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};
use crate::errors::LaunchpadError;
use crate::state::{
    BondingCurve, GraduationEvent, LaunchpadConfig,
    BONDING_CURVE_SEED, CONFIG_SEED, CURVE_VAULT_SEED,
};

#[derive(Accounts)]
pub struct Graduate<'info> {
    #[account(mut)]
    pub caller: Signer<'info>,

    #[account(
        seeds = [CONFIG_SEED],
        bump = config.bump
    )]
    pub config: Account<'info, LaunchpadConfig>,

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

    /// Raydium / Meteora Liquidity Destination or Escrow Authority
    /// CHECK: Validated by config authority or crank execution
    #[account(mut)]
    pub migration_recipient: AccountInfo<'info>,

    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<Graduate>) -> Result<()> {
    let bonding_curve = &mut ctx.accounts.bonding_curve;
    let config = &ctx.accounts.config;

    // Must have reached graduation target
    require!(
        bonding_curve.complete || bonding_curve.real_sol_reserves >= config.migration_sol_target,
        LaunchpadError::BondingCurveNotGraduated
    );

    bonding_curve.complete = true;
    let clock = Clock::get()?;

    emit!(GraduationEvent {
        mint: ctx.accounts.mint.key(),
        total_sol_raised: bonding_curve.real_sol_reserves,
        remaining_tokens: bonding_curve.real_token_reserves,
        timestamp: clock.unix_timestamp,
    });

    msg!(
        "Graduation confirmed for {}. Raised {} lamports. Seeding DEX liquidity.",
        ctx.accounts.mint.key(),
        bonding_curve.real_sol_reserves
    );

    Ok(())
}
