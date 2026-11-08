export interface QuoteResult {
  tokensOut?: number;
  solOut?: number;
  feeSol: number;
  pricePerTokenSol: number;
  priceImpact: number;
}

export class ClientCurve {
  // Constants for standard virtual curve
  static readonly VIRTUAL_SOL = 30; // 30 SOL virtual reserve
  static readonly VIRTUAL_TOKENS = 1_073_000_000; // 1.073B virtual tokens
  static readonly REAL_TOKEN_TARGET = 800_000_000; // 800M for sale
  static readonly MIGRATION_TARGET = 85; // 85 SOL raised to graduate
  static readonly DEX_RESERVE_TOKENS = 200_000_000; // 200M reserved for permanent DEX pool
  static readonly FEE_PERCENT = 0.01; // 1%

  static calculateBuyQuote(
    solIn: number,
    currentRealSol: number,
    currentRealTokens: number,
    isGraduated: boolean = false
  ): QuoteResult {
    if (solIn <= 0) {
      return { feeSol: 0, pricePerTokenSol: 0, priceImpact: 0, tokensOut: 0 };
    }

    const feeSol = solIn * this.FEE_PERCENT;
    const netSol = solIn - feeSol;

    // 1. If token is graduated (In Orbit 🪐) or bonding curve is full, trade directly on permanent AMM pool!
    if (isGraduated || currentRealTokens <= 0 || currentRealSol >= this.MIGRATION_TARGET) {
      const poolSol = Math.max(this.MIGRATION_TARGET, currentRealSol);
      // DEX pool has 200M initial reserve tokens, adjusted for post-graduation trades
      const extraSolAboveTarget = Math.max(0, currentRealSol - this.MIGRATION_TARGET);
      const estPoolTokens = Math.max(15_000_000, this.DEX_RESERVE_TOKENS - (extraSolAboveTarget * 1_200_000));
      const k = poolSol * estPoolTokens;

      const newPoolSol = poolSol + netSol;
      const newPoolTokens = k / newPoolSol;
      const tokensOut = Math.max(1, Math.round(estPoolTokens - newPoolTokens));

      const spotPrice = newPoolSol / newPoolTokens;
      const executionPrice = netSol / (tokensOut || 1);
      const priceImpact = Math.min(99.9, Math.max(0.1, ((executionPrice - spotPrice) / spotPrice) * 100));

      return {
        tokensOut,
        feeSol,
        pricePerTokenSol: spotPrice,
        priceImpact,
      };
    }

    // 2. Bonding curve mode (before 100% graduation)
    const vSol = this.VIRTUAL_SOL + currentRealSol;
    const vTokens = (this.VIRTUAL_TOKENS - (this.REAL_TOKEN_TARGET - currentRealTokens));

    const k = vSol * vTokens;
    const newVSol = vSol + netSol;
    const newVTokens = k / newVSol;
    let tokensOut = vTokens - newVTokens;

    if (tokensOut > currentRealTokens) {
      tokensOut = currentRealTokens;
    }

    const spotPrice = newVSol / newVTokens;
    const executionPrice = netSol / Math.max(1, tokensOut);
    const priceImpact = Math.min(99.9, Math.max(0.1, ((executionPrice - spotPrice) / spotPrice) * 100));

    return {
      tokensOut: Math.max(1, Math.round(tokensOut)),
      feeSol,
      pricePerTokenSol: spotPrice,
      priceImpact,
    };
  }

  static calculateSellQuote(
    tokensIn: number,
    currentRealSol: number,
    currentRealTokens: number,
    isGraduated: boolean = false
  ): QuoteResult {
    if (tokensIn <= 0) {
      return { feeSol: 0, pricePerTokenSol: 0, priceImpact: 0, solOut: 0 };
    }

    // 1. If token is graduated (In Orbit 🪐), sell directly into permanent AMM pool!
    if (isGraduated || currentRealTokens <= 0 || currentRealSol >= this.MIGRATION_TARGET) {
      const poolSol = Math.max(this.MIGRATION_TARGET, currentRealSol);
      const extraSolAboveTarget = Math.max(0, currentRealSol - this.MIGRATION_TARGET);
      const estPoolTokens = Math.max(15_000_000, this.DEX_RESERVE_TOKENS - (extraSolAboveTarget * 1_200_000));
      const k = poolSol * estPoolTokens;

      const newPoolTokens = estPoolTokens + tokensIn;
      const newPoolSol = k / newPoolTokens;
      const grossSolOut = Math.max(0.000001, poolSol - newPoolSol);

      const feeSol = grossSolOut * this.FEE_PERCENT;
      const netSolOut = Math.max(0, grossSolOut - feeSol);

      const spotPrice = newPoolSol / newPoolTokens;
      const executionPrice = grossSolOut / tokensIn;
      const priceImpact = Math.min(99.9, Math.max(0.1, ((spotPrice - executionPrice) / spotPrice) * 100));

      return {
        solOut: netSolOut,
        feeSol,
        pricePerTokenSol: spotPrice,
        priceImpact,
      };
    }

    // 2. Bonding curve mode
    const vSol = this.VIRTUAL_SOL + currentRealSol;
    const vTokens = (this.VIRTUAL_TOKENS - (this.REAL_TOKEN_TARGET - currentRealTokens));

    const k = vSol * vTokens;
    const newVTokens = vTokens + tokensIn;
    const newVSol = k / newVTokens;
    let grossSolOut = vSol - newVSol;

    if (grossSolOut > currentRealSol) {
      grossSolOut = currentRealSol;
    }

    const feeSol = grossSolOut * this.FEE_PERCENT;
    const netSolOut = Math.max(0, grossSolOut - feeSol);

    const spotPrice = newVSol / newVTokens;
    const executionPrice = grossSolOut / tokensIn;
    const priceImpact = Math.min(99.9, Math.max(0.1, ((spotPrice - executionPrice) / spotPrice) * 100));

    return {
      solOut: netSolOut,
      feeSol,
      pricePerTokenSol: spotPrice,
      priceImpact,
    };
  }

  static getProgress(realSol: number): number {
    return Math.min(100, Math.max(0, (realSol / this.MIGRATION_TARGET) * 100));
  }

  static getMarketCap(realSol: number, currentRealTokens: number, solPriceUsd: number = 150): { sol: number; usd: number } {
    const vSol = this.VIRTUAL_SOL + realSol;
    const vTokens = (this.VIRTUAL_TOKENS - (this.REAL_TOKEN_TARGET - currentRealTokens));
    const tokenPriceSol = vSol / vTokens;
    const mcSol = tokenPriceSol * 1_000_000_000;
    return {
      sol: mcSol,
      usd: mcSol * solPriceUsd,
    };
  }
}
