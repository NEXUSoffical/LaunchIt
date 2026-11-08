use anchor_lang::prelude::*;

pub mod curve;
pub mod errors;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("OrbitLaunch11111111111111111111111111111111");

#[program]
pub mod orbit_launch_it {
    use super::*;

    /// Initialize global Orbit launchpad platform parameters (fee bps, burn split, creation fee, virtual reserves, targets)
    pub fn initialize(
        ctx: Context<Initialize>,
        fee_basis_points: u16,
        burn_split_basis_points: u16,
        token_creation_fee_orbit: u64,
        initial_virtual_orbit: u64,
        initial_virtual_tokens: u64,
        real_token_target: u64,
        orbit_graduation_target: u64,
    ) -> Result<()> {
        instructions::initialize::handler(
            ctx,
            fee_basis_points,
            burn_split_basis_points,
            token_creation_fee_orbit,
            initial_virtual_orbit,
            initial_virtual_tokens,
            real_token_target,
            orbit_graduation_target,
        )
    }

    /// Deploy a new Token-2022 coin with on-chain metadata, burns creation fee, and locks initial supply into curve vault
    pub fn create_token(
        ctx: Context<CreateToken>,
        name: String,
        symbol: String,
        uri: String,
    ) -> Result<()> {
        instructions::create_token::handler(ctx, name, symbol, uri)
    }

    /// Buy tokens along the virtual constant product curve with $ORBIT (50% fee burned, 50% to treasury)
    pub fn buy(ctx: Context<Buy>, orbit_amount_in: u64, min_tokens_out: u64) -> Result<()> {
        instructions::buy::handler(ctx, orbit_amount_in, min_tokens_out)
    }

    /// Sell tokens back to the curve in exchange for $ORBIT (50% fee burned, 50% to treasury)
    pub fn sell(ctx: Context<Sell>, token_amount_in: u64, min_orbit_out: u64) -> Result<()> {
        instructions::sell::handler(ctx, token_amount_in, min_orbit_out)
    }

    /// Finalize graduation when $ORBIT target is reached ("Achieved Orbit" 🪐), locking liquidity permanently in AMM
    pub fn graduate(ctx: Context<Graduate>) -> Result<()> {
        instructions::graduate::handler(ctx)
    }
}

