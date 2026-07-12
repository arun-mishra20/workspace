/** Seeded PRNG (mulberry32) — deterministic across runs with the same seed */
export function createRng(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Box-Muller transform — one standard normal per call */
export function sampleStandardNormal(rng: () => number): number {
  let u = 0
  let v = 0
  while (u === 0) u = rng()
  while (v === 0) v = rng()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

/**
 * Cholesky decomposition L where L * L^T = correlation matrix.
 * Returns lower-triangular rows as Float64Arrays.
 */
export function choleskyDecompose(matrix: number[][]): Float64Array[] {
  const n = matrix.length
  const L: number[][] = Array.from({ length: n }, () => Array(n).fill(0))

  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let sum = matrix[i]![j]!
      for (let k = 0; k < j; k++) {
        sum -= L[i]![k]! * L[j]![k]!
      }
      if (i === j) {
        L[i]![j] = sum <= 0 ? 0 : Math.sqrt(sum)
      } else {
        L[i]![j] = L[j]![j] === 0 ? 0 : sum / L[j]![j]!
      }
    }
  }

  return L.map((row) => new Float64Array(row))
}

/** z = L * independent_normals */
export function sampleCorrelatedNormals(
  choleskyL: Float64Array[],
  independentZ: Float64Array,
): Float64Array {
  const n = choleskyL.length
  const result = new Float64Array(n)
  for (let i = 0; i < n; i++) {
    let sum = 0
    for (let j = 0; j <= i; j++) {
      sum += choleskyL[i]![j]! * independentZ[j]!
    }
    result[i] = sum
  }
  return result
}
