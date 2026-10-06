use anchor_lang::prelude::*;
use crate::state::{LaunchpadConfig, CONFIG_SEED};

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    /// Treasury address that collects platform trading fees
    /// CHECK: Validated as pubkey stored in config
    pub fee_recipient: AccountInfo<'info>,

    #[account(
        init,
        payer = authority,
        space = LaunchpadConfig::LEN,
        seeds = [CONFIG_SEED],
        bump
    )]
    pub config: Account<'info, LaunchpadConfig>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<Initialize>,
    fee_basis_points: u16,
    initial_virtual_sol: u64,
    initial_virtual_tokens: u64,
    real_token_target: u64,
    migration_sol_target: u64,
) -> Result<()> {
    let config = &mut ctx.accounts.config;
    config.authority = ctx.accounts.authority.key();
    config.fee_recipient = ctx.accounts.fee_recipient.key();
    config.fee_basis_points = fee_basis_points;
    config.initial_virtual_sol = initial_virtual_sol;
    config.initial_virtual_tokens = initial_virtual_tokens;
    config.real_token_target = real_token_target;
    config.migration_sol_target = migration_sol_target;
    config.total_tokens_launched = 0;
    config.bump = ctx.bumps.config;

    msg!("Launchpad initialized with fee: {} bps", fee_basis_points);
    Ok(())
}
