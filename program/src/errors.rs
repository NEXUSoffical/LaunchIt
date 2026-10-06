use anchor_lang::prelude::*;

#[error_code]
pub enum LaunchpadError {
    #[msg("Bonding curve is already complete and graduated to DEX.")]
    BondingCurveComplete,

    #[msg("Bonding curve has not reached graduation threshold yet.")]
    BondingCurveNotGraduated,

    #[msg("Calculation overflow or underflow occurred.")]
    MathOverflow,

    #[msg("Purchase would exceed maximum allowed reserve.")]
    ExceedsMaxSupply,

    #[msg("Slippage tolerance exceeded. Minimum expected amount not reached.")]
    SlippageExceeded,

    #[msg("Insufficient input amount provided.")]
    InsufficientInputAmount,

    #[msg("Insufficient liquidity available in the bonding curve.")]
    InsufficientLiquidity,

    #[msg("Creator does not have authority to perform this action.")]
    Unauthorized,

    #[msg("Token name exceeds maximum 32 bytes.")]
    NameTooLong,

    #[msg("Token symbol exceeds maximum 10 bytes.")]
    SymbolTooLong,

    #[msg("Token metadata URI exceeds maximum 200 bytes.")]
    UriTooLong,
}
