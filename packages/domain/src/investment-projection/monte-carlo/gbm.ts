/**
 * Geometric Brownian Motion monthly return parameters.
 *
 * User-entered annual return is treated as long-term CAGR.
 * Volatility drag (σ²/2) is subtracted from drift so simulated paths
 * converge to the expected CAGR over long horizons.
 */
export function annualToGbmMonthlyParams(
  annualReturnPercent: number,
  annualVolPercent: number,
): { drift: number; sigmaMonthly: number } {
  const annualReturn = annualReturnPercent / 100
  const annualVol = annualVolPercent / 100

  // Log-return drift from annual CAGR
  const muMonthly = Math.log(1 + annualReturn) / 12
  const sigmaMonthly = annualVol / Math.sqrt(12)
  const drift = muMonthly - (sigmaMonthly ** 2) / 2

  return { drift, sigmaMonthly }
}

/** GBM monthly return: exp(drift + σ·Z) − 1 */
export function gbmMonthlyReturn(
  drift: number,
  sigmaMonthly: number,
  z: number,
): number {
  return Math.exp(drift + sigmaMonthly * z) - 1
}
