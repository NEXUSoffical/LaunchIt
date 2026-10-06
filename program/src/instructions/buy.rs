use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};
use anchor_spl::token_2022::{self, TransferChecked};
use crate::curve::CurveMath;
use crate::errors::LaunchpadError;
use crate::state::{
    BondingCurve, GraduationEvent, LaunchpadConfig, TradeEvent,
    BONDING_CURVE_SEED, CONFIG_SEED, CURVE_VAULT_SEED,
};

#[derive(Accounts)]
pub struct Buy<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,

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
        token::authority = buyer,
        token::token_program = token_program
    )]
    pub buyer_token_account: Box<InterfaceAccount<'info, TokenAccount>>,

    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<Buy>, sol_amount_in: u64, min_tokens_out: u64) -> Result<()> {
    let bonding_curve = &mut ctx.accounts.bonding_curve;
    require!(!bonding_curve.complete, LaunchpadError::BondingCurveComplete);

    let config = &ctx.accounts.config;

    // 1. Calculate platform fee & net SOL
    let fee = CurveMath::calculate_fee(sol_amount_in, config.fee_basis_points)?;
    let net_sol = sol_amount_in
        .checked_sub(fee)
        .ok_or(LaunchpadError::MathOverflow)?;

    // 2. Calculate tokens received from constant product curve
    let tokens_out = CurveMath::calculate_buy_tokens_out(
        bonding_curve.virtual_sol_reserves,
        bonding_curve.virtual_token_reserves,
        bonding_curve.real_token_reserves,
        net_sol,
    )?;

    // 3. Slippage protection check
    require!(
        tokens_out >= min_tokens_out,
        LaunchpadError::SlippageExceeded
    );

    // 4. Transfer fee to platform treasury
    if fee > 0 {
        transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.buyer.to_account_info(),
                    to: ctx.accounts.fee_recipient.to_account_info(),
                },
            ),
            fee,
        )?;
    }

    // 5. Transfer net SOL from buyer to bonding curve PDA
    transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            Transfer {
                from: ctx.accounts.buyer.to_account_info(),
                to: ctx.accounts.bonding_curve.to_account_info(),
            },
        ),
        net_sol,
    )?;

    // 6. Transfer tokens from curve vault to buyer ATA
    let mint_key = ctx.accounts.mint.key();
    let curve_bump = bonding_curve.bump;
    let seeds = &[
        BONDING_CURVE_SEED,
        mint_key.as_ref(),
        &[curve_bump],
    ];
    let signer_seeds = &[&seeds[..]];

    token_2022::transfer_checked(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            TransferChecked {
                from: ctx.accounts.curve_vault.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
                to: ctx.accounts.buyer_token_account.to_account_info(),
                authority: ctx.accounts.bonding_curve.to_account_info(),
            },
            signer_seeds,
        ),
        tokens_out,
        6, // decimals
    )?;

    // 7. Update curve state
    bonding_curve.virtual_sol_reserves = bonding_curve
        .virtual_sol_reserves
        .checked_add(net_sol)
        .ok_or(LaunchpadError::MathOverflow)?;

    bonding_curve.virtual_token_reserves = bonding_curve
        .virtual_token_reserves
        .checked_sub(tokens_out)
        .ok_or(LaunchpadError::MathOverflow)?;

    bonding_curve.real_sol_reserves = bonding_curve
        .real_sol_reserves
        .checked_add(net_sol)
        .ok_or(LaunchpadError::MathOverflow)?;

    bonding_curve.real_token_reserves = bonding_curve
        .real_token_reserves
        .checked_sub(tokens_out)
        .ok_or(LaunchpadError::MathOverflow)?;

    let clock = Clock::get()?;

    // 8. Check graduation condition
    if bonding_curve.real_sol_reserves >= config.migration_sol_target
        || bonding_curve.real_token_reserves == 0
    {
        bonding_curve.complete = true;
        emit!(GraduationEvent {
            mint: mint_key,
            total_sol_raised: bonding_curve.real_sol_reserves,
            remaining_tokens: bonding_curve.real_token_reserves,
            timestamp: clock.unix_timestamp,
        });
        msg!("Bonding curve completed! Ready to migrate liquidity to DEX.");
    }

    emit!(TradeEvent {
        mint: mint_key,
        user: ctx.accounts.buyer.key(),
        is_buy: true,
        sol_amount: sol_amount_in,
        token_amount: tokens_out,
        virtual_sol_reserves: bonding_curve.virtual_sol_reserves,
        virtual_token_reserves: bonding_curve.virtual_token_reserves,
        real_sol_reserves: bonding_curve.real_sol_reserves,
        real_token_reserves: bonding_curve.real_token_reserves,
        fee_amount: fee,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
