/** Linear interpolation percentile (Hyndman type 7) */
export function interpolatedPercentile(sorted: Float64Array | number[], p: number): number {
  const n = sorted.length
  if (n === 0) return 0
  if (n === 1) return sorted[0]!

  const rank = (p / 100) * (n - 1)
  const lower = Math.floor(rank)
  const upper = Math.ceil(rank)
  const weight = rank - lower

  if (lower === upper) return sorted[lower]!
  return sorted[lower]! * (1 - weight) + sorted[upper]! * weight
}

export function computePercentileBands(
  paths: Float64Array[],
  horizonMonths: number,
): {
  p10: number[]
  p25: number[]
  p50: number[]
  p75: number[]
  p90: number[]
  p95: number[]
  best: number[]
  worst: number[]
  average: number[]
} {
  const p10: number[] = []
  const p25: number[] = []
  const p50: number[] = []
  const p75: number[] = []
  const p90: number[] = []
  const p95: number[] = []
  const best: number[] = []
  const worst: number[] = []
  const average: number[] = []

  const scratch = new Float64Array(paths.length)

  for (let month = 0; month <= horizonMonths; month++) {
    for (let i = 0; i < paths.length; i++) {
      scratch[i] = paths[i]![month] ?? 0
    }
    scratch.sort()

    p10.push(interpolatedPercentile(scratch, 10))
    p25.push(interpolatedPercentile(scratch, 25))
    p50.push(interpolatedPercentile(scratch, 50))
    p75.push(interpolatedPercentile(scratch, 75))
    p90.push(interpolatedPercentile(scratch, 90))
    p95.push(interpolatedPercentile(scratch, 95))
    worst.push(scratch[0]!)
    best.push(scratch[scratch.length - 1]!)

    let sum = 0
    for (let i = 0; i < scratch.length; i++) sum += scratch[i]!
    average.push(sum / scratch.length)
  }

  return { p10, p25, p50, p75, p90, p95, best, worst, average }
}

/** Freedman–Diaconis rule for histogram bin count */
export function freedmanDiaconisBinCount(values: Float64Array): number {
  const n = values.length
  if (n < 2) return 1

  const sorted = Float64Array.from(values).sort()
  const q1 = interpolatedPercentile(sorted, 25)
  const q3 = interpolatedPercentile(sorted, 75)
  const iqr = q3 - q1

  if (iqr === 0) return Math.min(20, Math.max(5, Math.ceil(Math.log2(n) + 1)))

  const binWidth = (2 * iqr) / Math.cbrt(n)
  const range = sorted[sorted.length - 1]! - sorted[0]!
  if (range === 0) return 1

  return Math.max(5, Math.min(50, Math.ceil(range / binWidth)))
}

/** Sturges rule fallback */
export function sturgesBinCount(n: number): number {
  return Math.max(5, Math.ceil(Math.log2(n) + 1))
}

export function buildHistogram(
  values: Float64Array,
  formatLabel: (low: number, high: number) => string,
): { bucket: string; count: number }[] {
  const n = values.length
  if (n === 0) return []

  let binCount = freedmanDiaconisBinCount(values)
  if (!Number.isFinite(binCount) || binCount < 1) {
    binCount = sturgesBinCount(n)
  }

  const sorted = Float64Array.from(values).sort()
  const min = sorted[0]!
  const max = sorted[sorted.length - 1]!
  const range = max - min || 1
  const binSize = range / binCount

  const counts = new Array<number>(binCount).fill(0)
  for (let i = 0; i < n; i++) {
    const v = values[i]!
    const index = Math.min(binCount - 1, Math.floor((v - min) / binSize))
    counts[index]!++
  }

  return counts.map((count, i) => ({
    bucket: formatLabel(min + i * binSize, min + (i + 1) * binSize),
    count,
  }))
}

export function formatCompact(n: number): string {
  if (n >= 10_000_000) return `${(n / 10_000_000).toFixed(1)}Cr`
  if (n >= 100_000) return `${(n / 100_000).toFixed(1)}L`
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`
  return n.toFixed(0)
}
