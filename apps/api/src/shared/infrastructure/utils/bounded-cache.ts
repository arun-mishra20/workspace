/**
 * A simple bounded in-memory cache with TTL and max-size eviction.
 *
 * - Entries expire after `ttlMs` milliseconds
 * - When the cache exceeds `maxSize`, the oldest entries are evicted
 * - A background sweep runs every `sweepIntervalMs` to remove expired entries
 *
 * Call `destroy()` to clear the sweep interval (e.g. in `onModuleDestroy`).
 */
export class BoundedCache<T> {
  private readonly cache = new Map<string, { expiresAt: number; value: T }>()
  private sweepTimer: ReturnType<typeof setInterval> | null = null

  constructor(
    private readonly options: {
      /** Maximum number of entries before oldest are evicted */
      maxSize: number
      /** Time-to-live for each entry in milliseconds */
      ttlMs: number
      /** How often to sweep expired entries (default: ttlMs * 2) */
      sweepIntervalMs?: number
    },
  ) {
    const sweepInterval = options.sweepIntervalMs ?? options.ttlMs * 2
    this.sweepTimer = setInterval(() => this.sweep(), sweepInterval)
    // Allow the process to exit even if the timer is still active
    this.sweepTimer.unref()
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key)
    if (!entry) return undefined

    if (entry.expiresAt <= Date.now()) {
      this.cache.delete(key)
      return undefined
    }

    return entry.value
  }

  set(key: string, value: T): void {
    // Delete first so re-insertion moves to end of Map insertion order
    this.cache.delete(key)

    this.cache.set(key, {
      expiresAt: Date.now() + this.options.ttlMs,
      value,
    })

    // Evict oldest entries if over max size
    if (this.cache.size > this.options.maxSize) {
      const excess = this.cache.size - this.options.maxSize
      const keys = this.cache.keys()
      for (let i = 0; i < excess; i++) {
        const next = keys.next()
        if (!next.done) this.cache.delete(next.value)
      }
    }
  }

  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  /** Delete all entries whose keys start with `prefix` */
  deleteByPrefix(prefix: string): number {
    let count = 0
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key)
        count++
      }
    }
    return count
  }

  clear(): void {
    this.cache.clear()
  }

  get size(): number {
    return this.cache.size
  }

  /** Remove all expired entries */
  private sweep(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache) {
      if (entry.expiresAt <= now) {
        this.cache.delete(key)
      }
    }
  }

  /** Stop the background sweep timer and clear the cache */
  destroy(): void {
    if (this.sweepTimer) {
      clearInterval(this.sweepTimer)
      this.sweepTimer = null
    }
    this.cache.clear()
  }
}
