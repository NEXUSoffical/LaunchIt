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
  static readonly FEE_PERCENT = 0.01; // 1%

  static calculateBuyQuote(
    solIn: number,
    currentRealSol: number,
    currentRealTokens: number
  ): QuoteResult {
    if (solIn <= 0) {
      return { feeSol: 0, pricePerTokenSol: 0, priceImpact: 0, tokensOut: 0 };
    }

    const feeSol = solIn * this.FEE_PERCENT;
    const netSol = solIn - feeSol;

    const vSol = this.VIRTUAL_SOL + currentRealSol;
    const vTokens = (this.VIRTUAL_TOKENS - (this.REAL_TOKEN_TARGET - currentRealTokens));

    const k = vSol * vTokens;
    const newVSol = vSol + netSol;
    const newVTokens = k / newVSol;
    let tokensOut = vTokens - newVTokens;

    if (tokensOut > currentRealTokens) {
      tokensOut = currentRealTokens;
    }

    const spotPrice = vSol / vTokens;
    const executionPrice = netSol / (tokensOut || 1);
    const priceImpact = Math.max(0, ((executionPrice - spotPrice) / spotPrice) * 100);

    return {
      tokensOut,
      feeSol,
      pricePerTokenSol: executionPrice,
      priceImpact,
    };
  }

  static calculateSellQuote(
    tokensIn: number,
    currentRealSol: number,
    currentRealTokens: number
  ): QuoteResult {
    if (tokensIn <= 0) {
      return { feeSol: 0, pricePerTokenSol: 0, priceImpact: 0, solOut: 0 };
    }

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

    const spotPrice = vSol / vTokens;
    const executionPrice = grossSolOut / tokensIn;
    const priceImpact = Math.max(0, ((spotPrice - executionPrice) / spotPrice) * 100);

    return {
      solOut: netSolOut,
      feeSol,
      pricePerTokenSol: executionPrice,
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
