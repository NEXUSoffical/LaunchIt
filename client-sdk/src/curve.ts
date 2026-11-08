/**
 * Pure TypeScript implementation of the Constant Product Bonding Curve math for Orbit Chain.
 * Uses 128-bit BigInt precision to match on-chain Rust calculations exactly.
 */

export interface BuyQuote {
  tokensOut: bigint;
  feeLamports: bigint;
  feeBurnedLamports: bigint;
  feeTreasuryLamports: bigint;
  netOrbitLamports: bigint;
  pricePerTokenOrbit: number;
  priceImpactPercent: number;
}

export interface SellQuote {
  orbitGrossLamports: bigint;
  feeLamports: bigint;
  feeBurnedLamports: bigint;
  feeTreasuryLamports: bigint;
  netOrbitLamports: bigint;
  pricePerTokenOrbit: number;
  priceImpactPercent: number;
}

export class CurveCalculator {
  /**
   * Calculate tokens received for a given gross $ORBIT input.
   */
  static getBuyQuote(
    orbitAmountLamports: bigint,
    virtualOrbitReserves: bigint,
    virtualTokenReserves: bigint,
    realTokenReserves: bigint,
    feeBasisPoints: number = 100, // 1% default
    burnSplitBasisPoints: number = 5000 // 50% burned
  ): BuyQuote {
    if (orbitAmountLamports <= 0n) {
      throw new Error("$ORBIT amount must be greater than zero");
    }

    const feeLamports = (orbitAmountLamports * BigInt(feeBasisPoints)) / 10000n;
    const feeBurnedLamports = (feeLamports * BigInt(burnSplitBasisPoints)) / 10000n;
    const feeTreasuryLamports = feeLamports - feeBurnedLamports;
    const netOrbitLamports = orbitAmountLamports - feeLamports;

    // k = v_orbit * v_token
    const k = virtualOrbitReserves * virtualTokenReserves;
    const newVirtualOrbit = virtualOrbitReserves + netOrbitLamports;
    const newVirtualToken = k / newVirtualOrbit;
    let tokensOut = virtualTokenReserves - newVirtualToken;

    if (tokensOut > realTokenReserves) {
      tokensOut = realTokenReserves;
    }

    // Spot prices ($ORBIT per token in 6 decimal units)
    const initialSpotPrice = Number(virtualOrbitReserves) / Number(virtualTokenReserves);
    const executionPrice = Number(netOrbitLamports) / Number(tokensOut);
    const priceImpactPercent = Math.max(0, ((executionPrice - initialSpotPrice) / initialSpotPrice) * 100);

    return {
      tokensOut,
      feeLamports,
      feeBurnedLamports,
      feeTreasuryLamports,
      netOrbitLamports,
      pricePerTokenOrbit: executionPrice / 1e3, // normalized
      priceImpactPercent,
    };
  }

  /**
   * Calculate $ORBIT received when selling a given token amount.
   */
  static getSellQuote(
    tokenAmountIn: bigint,
    virtualOrbitReserves: bigint,
    virtualTokenReserves: bigint,
    realOrbitReserves: bigint,
    feeBasisPoints: number = 100,
    burnSplitBasisPoints: number = 5000
  ): SellQuote {
    if (tokenAmountIn <= 0n) {
      throw new Error("Token amount must be greater than zero");
    }

    const k = virtualOrbitReserves * virtualTokenReserves;
    const newVirtualToken = virtualTokenReserves + tokenAmountIn;

    // Ceil division for solvency: (k + newVirtualToken - 1) / newVirtualToken
    const newVirtualOrbit = (k + newVirtualToken - 1n) / newVirtualToken;
    let orbitGrossLamports = virtualOrbitReserves - newVirtualOrbit;

    if (orbitGrossLamports > realOrbitReserves) {
      orbitGrossLamports = realOrbitReserves;
    }

    const feeLamports = (orbitGrossLamports * BigInt(feeBasisPoints)) / 10000n;
    const feeBurnedLamports = (feeLamports * BigInt(burnSplitBasisPoints)) / 10000n;
    const feeTreasuryLamports = feeLamports - feeBurnedLamports;
    const netOrbitLamports = orbitGrossLamports - feeLamports;

    const initialSpotPrice = Number(virtualOrbitReserves) / Number(virtualTokenReserves);
    const executionPrice = Number(orbitGrossLamports) / Number(tokenAmountIn);
    const priceImpactPercent = Math.max(0, ((initialSpotPrice - executionPrice) / initialSpotPrice) * 100);

    return {
      orbitGrossLamports,
      feeLamports,
      feeBurnedLamports,
      feeTreasuryLamports,
      netOrbitLamports,
      pricePerTokenOrbit: executionPrice / 1e3,
      priceImpactPercent,
    };
  }

  /**
   * Calculate Current Market Cap in $ORBIT
   * (Current Spot Price * Total Supply)
   */
  static getMarketCapOrbit(
    virtualOrbitReserves: bigint,
    virtualTokenReserves: bigint,
    totalSupplyTokens: bigint = 1_000_000_000n * 1_000_000n // 1B with 6 decimals
  ): number {
    const spotPrice = Number(virtualOrbitReserves) / Number(virtualTokenReserves);
    const totalTokens = Number(totalSupplyTokens) / 1e6;
    const spotPricePerToken = (spotPrice * 1e6) / 1e9; // $ORBIT per real token
    return spotPricePerToken * totalTokens;
  }

  /**
   * Calculate progress percentage toward DEX graduation / "Achieved Orbit" (e.g., 85,000 $ORBIT target)
   */
  static getGraduationProgress(
    realOrbitReservesLamports: bigint,
    migrationTargetLamports: bigint = 85_000n * 1_000_000_000n // 85,000 $ORBIT
  ): number {
    if (migrationTargetLamports <= 0n) return 100;
    const progress = (Number(realOrbitReservesLamports) / Number(migrationTargetLamports)) * 100;
    return Math.min(100, Math.max(0, progress));
  }
}

