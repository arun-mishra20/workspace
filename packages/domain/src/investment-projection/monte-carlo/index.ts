export { runMonteCarloSimulation, createSimulationContext } from './engine.js'
export {
  completedInvestmentYears,
  stepUpMultiplier,
  simulatePath,
  rebalanceIntervalMonths,
} from './pipeline.js'
export { annualToGbmMonthlyParams, gbmMonthlyReturn } from './gbm.js'
export {
  interpolatedPercentile,
  computePercentileBands,
  buildHistogram,
  freedmanDiaconisBinCount,
} from './statistics.js'
export {
  classifyAsset,
  resolveAssetVolatility,
  DEFAULT_VOLATILITY_PERCENT,
} from './volatility.js'
export { buildCorrelationMatrix, correlationBetween } from './correlation.js'
export { createRng, choleskyDecompose } from './rng.js'
export type {
  SimulationContext,
  PathState,
  PathResult,
  ResolvedSimulationAsset,
  MonteCarloTaxContext,
  MonteCarloTaxHandler,
  AssetCategory,
} from './types.js'
