use anchor_lang::prelude::*;

pub const CONFIG_SEED: &[u8] = b"launchpad_config";
pub const BONDING_CURVE_SEED: &[u8] = b"bonding_curve";
pub const CURVE_VAULT_SEED: &[u8] = b"curve_vault";

#[account]
pub struct LaunchpadConfig {
    pub authority: Pubkey,
    pub fee_recipient: Pubkey,
    pub fee_basis_points: u16,         // 100 = 1%
    pub initial_virtual_sol: u64,       // 30 SOL in lamports
    pub initial_virtual_tokens: u64,    // 1,073,000,000 tokens (6 decimals)
    pub real_token_target: u64,         // 800,000,000 tokens (6 decimals) for sale
    pub migration_sol_target: u64,      // 85 SOL in lamports graduation threshold
    pub total_tokens_launched: u64,
    pub bump: u8,
}

impl LaunchpadConfig {
    pub const LEN: usize = 8 + 32 + 32 + 2 + 8 + 8 + 8 + 8 + 8 + 1;
}

#[account]
pub struct BondingCurve {
    pub mint: Pubkey,
    pub creator: Pubkey,
    pub virtual_sol_reserves: u64,
    pub virtual_token_reserves: u64,
    pub real_sol_reserves: u64,
    pub real_token_reserves: u64,
    pub token_total_supply: u64,
    pub complete: bool,
    pub created_at: i64,
    pub bump: u8,
}

impl BondingCurve {
    pub const LEN: usize = 8 + 32 + 32 + 8 + 8 + 8 + 8 + 8 + 1 + 8 + 1;
}

// ----------------------------------------------------
// Events emitted for real-time indexing & frontend UX
// ----------------------------------------------------

#[event]
pub struct TokenCreatedEvent {
    pub mint: Pubkey,
    pub creator: Pubkey,
    pub name: String,
    pub symbol: String,
    pub uri: String,
    pub timestamp: i64,
}

#[event]
pub struct TradeEvent {
    pub mint: Pubkey,
    pub user: Pubkey,
    pub is_buy: bool,
    pub sol_amount: u64,
    pub token_amount: u64,
    pub virtual_sol_reserves: u64,
    pub virtual_token_reserves: u64,
    pub real_sol_reserves: u64,
    pub real_token_reserves: u64,
    pub fee_amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct GraduationEvent {
    pub mint: Pubkey,
    pub total_sol_raised: u64,
    pub remaining_tokens: u64,
    pub timestamp: i64,
}
