/**
 * Pure TypeScript implementation of the Constant Product Bonding Curve math.
 * Uses 128-bit BigInt precision to match on-chain Rust calculations exactly.
 */

export interface BuyQuote {
  tokensOut: bigint;
  feeLamports: bigint;
  netSolLamports: bigint;
  pricePerTokenSol: number;
  priceImpactPercent: number;
}

export interface SellQuote {
  solGrossLamports: bigint;
  feeLamports: bigint;
  netSolLamports: bigint;
  pricePerTokenSol: number;
  priceImpactPercent: number;
}

export class CurveCalculator {
  /**
   * Calculate tokens received for a given gross SOL input.
   */
  static getBuyQuote(
    solAmountLamports: bigint,
    virtualSolReserves: bigint,
    virtualTokenReserves: bigint,
    realTokenReserves: bigint,
    feeBasisPoints: number = 100 // 1% default
  ): BuyQuote {
    if (solAmountLamports <= 0n) {
      throw new Error("SOL amount must be greater than zero");
    }

    const feeLamports = (solAmountLamports * BigInt(feeBasisPoints)) / 10000n;
    const netSolLamports = solAmountLamports - feeLamports;

    // k = v_sol * v_token
    const k = virtualSolReserves * virtualTokenReserves;
    const newVirtualSol = virtualSolReserves + netSolLamports;
    const newVirtualToken = k / newVirtualSol;
    let tokensOut = virtualTokenReserves - newVirtualToken;

    if (tokensOut > realTokenReserves) {
      tokensOut = realTokenReserves;
    }

    // Spot prices (SOL per token in 6 decimal units)
    const initialSpotPrice = Number(virtualSolReserves) / Number(virtualTokenReserves);
    const executionPrice = Number(netSolLamports) / Number(tokensOut);
    const priceImpactPercent = Math.max(0, ((executionPrice - initialSpotPrice) / initialSpotPrice) * 100);

    return {
      tokensOut,
      feeLamports,
      netSolLamports,
      pricePerTokenSol: executionPrice / 1e3, // normalized
      priceImpactPercent,
    };
  }

  /**
   * Calculate SOL received when selling a given token amount.
   */
  static getSellQuote(
    tokenAmountIn: bigint,
    virtualSolReserves: bigint,
    virtualTokenReserves: bigint,
    realSolReserves: bigint,
    feeBasisPoints: number = 100
  ): SellQuote {
    if (tokenAmountIn <= 0n) {
      throw new Error("Token amount must be greater than zero");
    }

    const k = virtualSolReserves * virtualTokenReserves;
    const newVirtualToken = virtualTokenReserves + tokenAmountIn;

    // Ceil division for solvency: (k + newVirtualToken - 1) / newVirtualToken
    const newVirtualSol = (k + newVirtualToken - 1n) / newVirtualToken;
    let solGrossLamports = virtualSolReserves - newVirtualSol;

    if (solGrossLamports > realSolReserves) {
      solGrossLamports = realSolReserves;
    }

    const feeLamports = (solGrossLamports * BigInt(feeBasisPoints)) / 10000n;
    const netSolLamports = solGrossLamports - feeLamports;

    const initialSpotPrice = Number(virtualSolReserves) / Number(virtualTokenReserves);
    const executionPrice = Number(solGrossLamports) / Number(tokenAmountIn);
    const priceImpactPercent = Math.max(0, ((initialSpotPrice - executionPrice) / initialSpotPrice) * 100);

    return {
      solGrossLamports,
      feeLamports,
      netSolLamports,
      pricePerTokenSol: executionPrice / 1e3,
      priceImpactPercent,
    };
  }

  /**
   * Calculate Current Market Cap in SOL
   * (Current Spot Price * Total Supply)
   */
  static getMarketCapSol(
    virtualSolReserves: bigint,
    virtualTokenReserves: bigint,
    totalSupplyTokens: bigint = 1_000_000_000n * 1_000_000n // 1B with 6 decimals
  ): number {
    const spotPrice = Number(virtualSolReserves) / Number(virtualTokenReserves);
    const totalTokens = Number(totalSupplyTokens) / 1e6;
    const spotPricePerToken = spotPrice * 1e6 / 1e9; // SOL per real token
    return spotPricePerToken * totalTokens;
  }

  /**
   * Calculate progress percentage toward DEX graduation (e.g., 85 SOL target)
   */
  static getGraduationProgress(
    realSolReservesLamports: bigint,
    migrationTargetLamports: bigint = 85n * 1_000_000_000n // 85 SOL
  ): number {
    if (migrationTargetLamports <= 0n) return 100;
    const progress = (Number(realSolReservesLamports) / Number(migrationTargetLamports)) * 100;
    return Math.min(100, Math.max(0, progress));
  }
}
