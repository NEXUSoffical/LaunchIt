use anchor_lang::prelude::*;

pub mod curve;
pub mod errors;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("Launch1111111111111111111111111111111111111");

#[program]
pub mod launchpad {
    use super::*;

    /// Initialize global launchpad platform parameters (fee bps, virtual reserves, targets)
    pub fn initialize(
        ctx: Context<Initialize>,
        fee_basis_points: u16,
        initial_virtual_sol: u64,
        initial_virtual_tokens: u64,
        real_token_target: u64,
        migration_sol_target: u64,
    ) -> Result<()> {
        instructions::initialize::handler(
            ctx,
            fee_basis_points,
            initial_virtual_sol,
            initial_virtual_tokens,
            real_token_target,
            migration_sol_target,
        )
    }

    /// Deploy a new Token-2022 coin with on-chain metadata and lock initial supply into curve vault
    pub fn create_token(
        ctx: Context<CreateToken>,
        name: String,
        symbol: String,
        uri: String,
    ) -> Result<()> {
        instructions::create_token::handler(ctx, name, symbol, uri)
    }

    /// Buy tokens along the virtual constant product curve with SOL
    pub fn buy(ctx: Context<Buy>, sol_amount_in: u64, min_tokens_out: u64) -> Result<()> {
        instructions::buy::handler(ctx, sol_amount_in, min_tokens_out)
    }

    /// Sell tokens back to the curve in exchange for SOL
    pub fn sell(ctx: Context<Sell>, token_amount_in: u64, min_sol_out: u64) -> Result<()> {
        instructions::sell::handler(ctx, token_amount_in, min_sol_out)
    }

    /// Finalize graduation when SOL target is reached, triggering DEX liquidity migration
    pub fn graduate(ctx: Context<Graduate>) -> Result<()> {
        instructions::graduate::handler(ctx)
    }
}
