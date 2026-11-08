use crate::errors::LaunchpadError;
use anchor_lang::prelude::*;

/// Constant product bonding curve math module for Orbit Chain.
/// 
/// Uses a virtual constant product invariant:
///     k = virtual_orbit_reserves * virtual_token_reserves
///
/// This provides predictable liquidity from the very first trade without requiring
/// any initial $ORBIT capital from creators, ensuring a 100% fair launch.
pub struct CurveMath;

impl CurveMath {
    /// Calculate the number of tokens received for a given net $ORBIT deposit.
    ///
    /// Formula:
    ///     tokens_out = virtual_token_reserves - (k / (virtual_orbit_reserves + orbit_amount_in))
    pub fn calculate_buy_tokens_out(
        virtual_orbit_reserves: u64,
        virtual_token_reserves: u64,
        real_token_reserves: u64,
        orbit_amount_in: u64,
    ) -> Result<u64> {
        if orbit_amount_in == 0 {
            return Err(LaunchpadError::InsufficientInputAmount.into());
        }

        let v_orbit = virtual_orbit_reserves as u128;
        let v_token = virtual_token_reserves as u128;
        let orbit_in = orbit_amount_in as u128;

        // k = v_orbit * v_token
        let k = v_orbit
            .checked_mul(v_token)
            .ok_or(LaunchpadError::MathOverflow)?;

        // new_v_orbit = v_orbit + orbit_in
        let new_v_orbit = v_orbit
            .checked_add(orbit_in)
            .ok_or(LaunchpadError::MathOverflow)?;

        // new_v_token = k / new_v_orbit
        let new_v_token = k
            .checked_div(new_v_orbit)
            .ok_or(LaunchpadError::MathOverflow)?;

        // tokens_out = v_token - new_v_token
        let tokens_out = v_token
            .checked_sub(new_v_token)
            .ok_or(LaunchpadError::MathOverflow)?;

        let tokens_out_u64 = u64::try_from(tokens_out)
            .map_err(|_| LaunchpadError::MathOverflow)?;

        // Cap to available real token reserves on the curve
        if tokens_out_u64 > real_token_reserves {
            return Err(LaunchpadError::InsufficientLiquidity.into());
        }

        Ok(tokens_out_u64)
    }

    /// Calculate the amount of $ORBIT received for returning a given token amount to the curve.
    ///
    /// Formula:
    ///     orbit_gross_out = virtual_orbit_reserves - (k / (virtual_token_reserves + token_amount_in))
    pub fn calculate_sell_orbit_out(
        virtual_orbit_reserves: u64,
        virtual_token_reserves: u64,
        real_orbit_reserves: u64,
        token_amount_in: u64,
    ) -> Result<u64> {
        if token_amount_in == 0 {
            return Err(LaunchpadError::InsufficientInputAmount.into());
        }

        let v_orbit = virtual_orbit_reserves as u128;
        let v_token = virtual_token_reserves as u128;
        let tokens_in = token_amount_in as u128;

        // k = v_orbit * v_token
        let k = v_orbit
            .checked_mul(v_token)
            .ok_or(LaunchpadError::MathOverflow)?;

        // new_v_token = v_token + tokens_in
        let new_v_token = v_token
            .checked_add(tokens_in)
            .ok_or(LaunchpadError::MathOverflow)?;

        // new_v_orbit = ceiling(k / new_v_token) to protect curve solvency
        let new_v_orbit = k
            .checked_add(new_v_token.checked_sub(1).ok_or(LaunchpadError::MathOverflow)?)
            .ok_or(LaunchpadError::MathOverflow)?
            .checked_div(new_v_token)
            .ok_or(LaunchpadError::MathOverflow)?;

        // orbit_gross_out = v_orbit - new_v_orbit
        let orbit_gross_out = v_orbit
            .checked_sub(new_v_orbit)
            .ok_or(LaunchpadError::MathOverflow)?;

        let orbit_gross_u64 = u64::try_from(orbit_gross_out)
            .map_err(|_| LaunchpadError::MathOverflow)?;

        // Curve cannot pay out more $ORBIT than it holds in real reserves
        if orbit_gross_u64 > real_orbit_reserves {
            return Err(LaunchpadError::InsufficientLiquidity.into());
        }

        Ok(orbit_gross_u64)
    }

    /// Calculate total protocol fee given basis points (e.g. 100 bps = 1.00%)
    pub fn calculate_fee(amount: u64, fee_bps: u16) -> Result<u64> {
        let amount_u128 = amount as u128;
        let bps = fee_bps as u128;
        let fee = amount_u128
            .checked_mul(bps)
            .ok_or(LaunchpadError::MathOverflow)?
            .checked_div(10_000)
            .ok_or(LaunchpadError::MathOverflow)?;

        u64::try_from(fee).map_err(|_| LaunchpadError::MathOverflow.into())
    }

    /// Split fee into (burned_amount, treasury_amount) based on burn_split_bps (e.g. 5000 = 50%)
    pub fn calculate_fee_split(fee: u64, burn_split_bps: u16) -> Result<(u64, u64)> {
        if burn_split_bps > 10_000 {
            return Err(LaunchpadError::InvalidBurnSplit.into());
        }

        let fee_u128 = fee as u128;
        let burn_bps = burn_split_bps as u128;
        let burned = fee_u128
            .checked_mul(burn_bps)
            .ok_or(LaunchpadError::MathOverflow)?
            .checked_div(10_000)
            .ok_or(LaunchpadError::MathOverflow)?;

        let burned_u64 = u64::try_from(burned).map_err(|_| LaunchpadError::MathOverflow)?;
        let treasury_u64 = fee.checked_sub(burned_u64).ok_or(LaunchpadError::MathOverflow)?;

        Ok((burned_u64, treasury_u64))
    }
}

