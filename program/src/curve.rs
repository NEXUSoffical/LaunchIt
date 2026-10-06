use crate::errors::LaunchpadError;
use anchor_lang::prelude::*;

/// Constant product bonding curve math module.
/// 
/// Uses a virtual constant product invariant:
///     k = virtual_sol_reserves * virtual_token_reserves
///
/// This provides predictable liquidity from the very first trade without requiring
/// any initial SOL capital, ensuring a 100% fair launch for creators.
pub struct CurveMath;

impl CurveMath {
    /// Calculate the number of tokens received for a given net SOL deposit.
    ///
    /// Formula:
    ///     tokens_out = virtual_token_reserves - (k / (virtual_sol_reserves + sol_amount_in))
    pub fn calculate_buy_tokens_out(
        virtual_sol_reserves: u64,
        virtual_token_reserves: u64,
        real_token_reserves: u64,
        sol_amount_in: u64,
    ) -> Result<u64> {
        if sol_amount_in == 0 {
            return Err(LaunchpadError::InsufficientInputAmount.into());
        }

        let v_sol = virtual_sol_reserves as u128;
        let v_token = virtual_token_reserves as u128;
        let sol_in = sol_amount_in as u128;

        // k = v_sol * v_token
        let k = v_sol
            .checked_mul(v_token)
            .ok_or(LaunchpadError::MathOverflow)?;

        // new_v_sol = v_sol + sol_in
        let new_v_sol = v_sol
            .checked_add(sol_in)
            .ok_or(LaunchpadError::MathOverflow)?;

        // new_v_token = k / new_v_sol
        let new_v_token = k
            .checked_div(new_v_sol)
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

    /// Calculate the amount of SOL received for returning a given token amount to the curve.
    ///
    /// Formula:
    ///     sol_gross_out = virtual_sol_reserves - (k / (virtual_token_reserves + token_amount_in))
    pub fn calculate_sell_sol_out(
        virtual_sol_reserves: u64,
        virtual_token_reserves: u64,
        real_sol_reserves: u64,
        token_amount_in: u64,
    ) -> Result<u64> {
        if token_amount_in == 0 {
            return Err(LaunchpadError::InsufficientInputAmount.into());
        }

        let v_sol = virtual_sol_reserves as u128;
        let v_token = virtual_token_reserves as u128;
        let tokens_in = token_amount_in as u128;

        // k = v_sol * v_token
        let k = v_sol
            .checked_mul(v_token)
            .ok_or(LaunchpadError::MathOverflow)?;

        // new_v_token = v_token + tokens_in
        let new_v_token = v_token
            .checked_add(tokens_in)
            .ok_or(LaunchpadError::MathOverflow)?;

        // new_v_sol = ceiling(k / new_v_token) to protect curve solvency
        let new_v_sol = k
            .checked_add(new_v_token.checked_sub(1).ok_or(LaunchpadError::MathOverflow)?)
            .ok_or(LaunchpadError::MathOverflow)?
            .checked_div(new_v_token)
            .ok_or(LaunchpadError::MathOverflow)?;

        // sol_gross_out = v_sol - new_v_sol
        let sol_gross_out = v_sol
            .checked_sub(new_v_sol)
            .ok_or(LaunchpadError::MathOverflow)?;

        let sol_gross_u64 = u64::try_from(sol_gross_out)
            .map_err(|_| LaunchpadError::MathOverflow)?;

        // Curve cannot pay out more SOL than it holds in real reserves
        if sol_gross_u64 > real_sol_reserves {
            return Err(LaunchpadError::InsufficientLiquidity.into());
        }

        Ok(sol_gross_u64)
    }

    /// Calculate protocol fee in lamports given basis points (e.g. 100 bps = 1.00%)
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
}
