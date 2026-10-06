use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};
use anchor_spl::token_2022::{self, MintTo, SetAuthority};
use spl_token_2022::instruction::AuthorityType;
use crate::errors::LaunchpadError;
use crate::state::{BondingCurve, LaunchpadConfig, BONDING_CURVE_SEED, CONFIG_SEED, CURVE_VAULT_SEED, TokenCreatedEvent};

pub const TOTAL_SUPPLY: u64 = 1_000_000_000_000_000; // 1 Billion tokens with 6 decimals

#[derive(Accounts)]
#[instruction(name: String, symbol: String, uri: String)]
pub struct CreateToken<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        mut,
        seeds = [CONFIG_SEED],
        bump = config.bump
    )]
    pub config: Account<'info, LaunchpadConfig>,

    #[account(
        init,
        payer = creator,
        mint::decimals = 6,
        mint::authority = bonding_curve,
        mint::freeze_authority = bonding_curve,
        mint::token_program = token_program
    )]
    pub mint: Box<InterfaceAccount<'info, Mint>>,

    #[account(
        init,
        payer = creator,
        space = BondingCurve::LEN,
        seeds = [BONDING_CURVE_SEED, mint.key().as_ref()],
        bump
    )]
    pub bonding_curve: Account<'info, BondingCurve>,

    #[account(
        init,
        payer = creator,
        token::mint = mint,
        token::authority = bonding_curve,
        token::token_program = token_program,
        seeds = [CURVE_VAULT_SEED, mint.key().as_ref()],
        bump
    )]
    pub curve_vault: Box<InterfaceAccount<'info, TokenAccount>>,

    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(
    ctx: Context<CreateToken>,
    name: String,
    symbol: String,
    uri: String,
) -> Result<()> {
    require!(name.len() <= 32, LaunchpadError::NameTooLong);
    require!(symbol.len() <= 10, LaunchpadError::SymbolTooLong);
    require!(uri.len() <= 200, LaunchpadError::UriTooLong);

    let mint_key = ctx.accounts.mint.key();
    let curve_bump = ctx.bumps.bonding_curve;
    let seeds = &[
        BONDING_CURVE_SEED,
        mint_key.as_ref(),
        &[curve_bump],
    ];
    let signer_seeds = &[&seeds[..]];

    // 1. Mint 100% of supply to the curve vault PDA
    token_2022::mint_to(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            MintTo {
                mint: ctx.accounts.mint.to_account_info(),
                to: ctx.accounts.curve_vault.to_account_info(),
                authority: ctx.accounts.bonding_curve.to_account_info(),
            },
            signer_seeds,
        ),
        TOTAL_SUPPLY,
    )?;

    // 2. Permanently revoke mint authority (Zero rug potential - supply is immutable)
    token_2022::set_authority(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            SetAuthority {
                current_authority: ctx.accounts.bonding_curve.to_account_info(),
                account_or_mint: ctx.accounts.mint.to_account_info(),
            },
            signer_seeds,
        ),
        AuthorityType::MintTokens,
        None,
    )?;

    // 3. Initialize Bonding Curve state
    let clock = Clock::get()?;
    let config = &mut ctx.accounts.config;
    let bonding_curve = &mut ctx.accounts.bonding_curve;

    bonding_curve.mint = mint_key;
    bonding_curve.creator = ctx.accounts.creator.key();
    bonding_curve.virtual_sol_reserves = config.initial_virtual_sol;
    bonding_curve.virtual_token_reserves = config.initial_virtual_tokens;
    bonding_curve.real_sol_reserves = 0;
    bonding_curve.real_token_reserves = config.real_token_target;
    bonding_curve.token_total_supply = TOTAL_SUPPLY;
    bonding_curve.complete = false;
    bonding_curve.created_at = clock.unix_timestamp;
    bonding_curve.bump = curve_bump;

    config.total_tokens_launched = config
        .total_tokens_launched
        .checked_add(1)
        .ok_or(LaunchpadError::MathOverflow)?;

    emit!(TokenCreatedEvent {
        mint: mint_key,
        creator: ctx.accounts.creator.key(),
        name,
        symbol,
        uri,
        timestamp: clock.unix_timestamp,
    });

    msg!("Token-2022 created and 1B supply locked in curve vault: {}", mint_key);
    Ok(())
}
