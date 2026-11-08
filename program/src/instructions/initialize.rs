use anchor_lang::prelude::*;
use crate::state::{OrbitLaunchConfig, CONFIG_SEED};

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    /// Treasury address that collects platform protocol revenue
    /// CHECK: Validated as pubkey stored in config
    pub treasury: AccountInfo<'info>,

    /// Burn address where $ORBIT is permanently removed from circulation
    /// CHECK: Validated as pubkey stored in config
    pub burn_address: AccountInfo<'info>,

    #[account(
        init,
        payer = authority,
        space = OrbitLaunchConfig::LEN,
        seeds = [CONFIG_SEED],
        bump
    )]
    pub config: Account<'info, OrbitLaunchConfig>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<Initialize>,
    fee_basis_points: u16,
    burn_split_basis_points: u16,
    token_creation_fee_orbit: u64,
    initial_virtual_orbit: u64,
    initial_virtual_tokens: u64,
    real_token_target: u64,
    orbit_graduation_target: u64,
) -> Result<()> {
    let config = &mut ctx.accounts.config;
    config.authority = ctx.accounts.authority.key();
    config.treasury = ctx.accounts.treasury.key();
    config.burn_address = ctx.accounts.burn_address.key();
    config.fee_basis_points = fee_basis_points;
    config.burn_split_basis_points = burn_split_basis_points;
    config.token_creation_fee_orbit = token_creation_fee_orbit;
    config.initial_virtual_orbit = initial_virtual_orbit;
    config.initial_virtual_tokens = initial_virtual_tokens;
    config.real_token_target = real_token_target;
    config.orbit_graduation_target = orbit_graduation_target;
    config.total_tokens_launched = 0;
    config.total_orbit_burned = 0;
    config.bump = ctx.bumps.config;

    msg!("Orbit Launchpad initialized: {} bps fee, {} bps burn split", fee_basis_points, burn_split_basis_points);
    Ok(())
}

