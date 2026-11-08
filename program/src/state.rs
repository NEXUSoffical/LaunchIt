use anchor_lang::prelude::*;

pub const CONFIG_SEED: &[u8] = b"orbit_launch_config";
pub const BONDING_CURVE_SEED: &[u8] = b"orbit_bonding_curve";
pub const CURVE_VAULT_SEED: &[u8] = b"orbit_curve_vault";

#[account]
pub struct OrbitLaunchConfig {
    pub authority: Pubkey,
    pub treasury: Pubkey,
    pub burn_address: Pubkey,            // Address where $ORBIT is permanently incinerated
    pub fee_basis_points: u16,           // 100 = 1.00%
    pub burn_split_basis_points: u16,    // 5000 = 50% burned, 50% treasury
    pub token_creation_fee_orbit: u64,   // Anti-spam creation fee in $ORBIT
    pub initial_virtual_orbit: u64,      // Virtual $ORBIT reserve floor (e.g., 30,000 $ORBIT)
    pub initial_virtual_tokens: u64,     // 1,073,000,000 tokens (6 decimals)
    pub real_token_target: u64,          // 800,000,000 tokens for sale on curve
    pub orbit_graduation_target: u64,    // Target $ORBIT to Achieve Orbit (e.g. 85,000 $ORBIT)
    pub total_tokens_launched: u64,
    pub total_orbit_burned: u64,         // On-chain odometer of total $ORBIT destroyed
    pub bump: u8,
}

impl OrbitLaunchConfig {
    // 8 (discriminator) + 32 + 32 + 32 + 2 + 2 + 8 + 8 + 8 + 8 + 8 + 8 + 8 + 1
    pub const LEN: usize = 8 + 32 + 32 + 32 + 2 + 2 + 8 + 8 + 8 + 8 + 8 + 8 + 8 + 1;
}

#[account]
pub struct BondingCurve {
    pub mint: Pubkey,
    pub creator: Pubkey,
    pub virtual_orbit_reserves: u64,
    pub virtual_token_reserves: u64,
    pub real_orbit_reserves: u64,
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
    pub orbit_amount: u64,
    pub token_amount: u64,
    pub virtual_orbit_reserves: u64,
    pub virtual_token_reserves: u64,
    pub real_orbit_reserves: u64,
    pub real_token_reserves: u64,
    pub fee_treasury: u64,
    pub fee_burned: u64,
    pub timestamp: i64,
}

#[event]
pub struct AchievedOrbitEvent {
    pub mint: Pubkey,
    pub total_orbit_raised: u64,
    pub remaining_tokens: u64,
    pub timestamp: i64,
}

#[event]
pub struct OrbitBurnEvent {
    pub amount_burned: u64,
    pub total_burned_to_date: u64,
    pub reason: String,
    pub timestamp: i64,
}

