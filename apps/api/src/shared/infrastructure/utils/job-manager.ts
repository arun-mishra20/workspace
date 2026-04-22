import { Injectable, Logger } from '@nestjs/common'

import type { OnModuleDestroy } from '@nestjs/common'

type JobFn = () => Promise<void>

interface QueuedJob {
  userId: string
  jobType: string
  jobId: string
  fn: JobFn
}

interface RunningJobInfo {
  userId: string
  jobType: string
  startedAt: number
}

/**
 * In-memory job manager with concurrency control.
 *
 * - Global concurrency limit (default 5)
 * - Per-user concurrency limit (default 2)
 * - Bounded pending queue (default 20)
 * - Duplicate job prevention (same userId + jobType)
 * - Graceful drain on shutdown
 */
@Injectable()
export class JobManager implements OnModuleDestroy {
  /** Max concurrent jobs across all users */
  private static readonly MAX_CONCURRENT_GLOBAL = 5
  /** Max concurrent jobs per user */
  private static readonly MAX_CONCURRENT_PER_USER = 2
  /** Max pending jobs in the queue */
  private static readonly MAX_QUEUE_SIZE = 20

  private readonly logger = new Logger(JobManager.name)

  /** Currently running jobs keyed by jobId */
  private readonly running = new Map<string, RunningJobInfo>()
  /** FIFO queue of jobs waiting to run */
  private readonly queue: QueuedJob[] = []
  /** Whether shutdown has been requested */
  private shuttingDown = false

  /**
   * Enqueue a background job with concurrency control.
   *
   * @returns true if the job was accepted (running or queued), false if rejected
   */
  enqueue(params: {
    userId: string
    jobType: string
    jobId: string
    fn: JobFn
  }): boolean {
    if (this.shuttingDown) {
      this.logger.warn(`Job ${params.jobId} rejected — shutting down`)
      return false
    }

    // Duplicate check: same user + type already running or queued
    if (this.isDuplicate(params.userId, params.jobType)) {
      this.logger.warn(
        `Job ${params.jobId} rejected — duplicate (user=${params.userId}, type=${params.jobType})`,
      )
      return false
    }

    // Queue full check
    if (this.queue.length >= JobManager.MAX_QUEUE_SIZE) {
      this.logger.warn(
        `Job ${params.jobId} rejected — queue full (${this.queue.length}/${JobManager.MAX_QUEUE_SIZE})`,
      )
      return false
    }

    // Try to run immediately if under limits
    if (this.canRunNow(params.userId)) {
      this.startJob(params)
    } else {
      this.queue.push(params)
      this.logger.debug(
        `Job ${params.jobId} queued (queue=${this.queue.length}, running=${this.running.size})`,
      )
    }

    return true
  }

  /** Check if a specific user + jobType combination is already running or queued */
  isDuplicate(userId: string, jobType: string): boolean {
    for (const info of this.running.values()) {
      if (info.userId === userId && info.jobType === jobType) return true
    }
    return this.queue.some((q) => q.userId === userId && q.jobType === jobType)
  }

  get stats() {
    return {
      running: this.running.size,
      queued: this.queue.length,
    }
  }

  onModuleDestroy(): void {
    this.shuttingDown = true
    // Clear the queue — running jobs will finish naturally
    const drained = this.queue.length
    this.queue.length = 0
    if (drained > 0) {
      this.logger.log(`Drained ${drained} pending jobs from queue on shutdown`)
    }
  }

  private canRunNow(userId: string): boolean {
    if (this.running.size >= JobManager.MAX_CONCURRENT_GLOBAL) return false

    let userCount = 0
    for (const info of this.running.values()) {
      if (info.userId === userId) userCount++
    }
    return userCount < JobManager.MAX_CONCURRENT_PER_USER
  }

  private startJob(job: QueuedJob): void {
    this.running.set(job.jobId, {
      userId: job.userId,
      jobType: job.jobType,
      startedAt: Date.now(),
    })

    this.logger.debug(
      `Starting job ${job.jobId} (type=${job.jobType}, user=${job.userId}, running=${this.running.size})`,
    )

    job.fn()
      .catch((error) => {
        this.logger.error(
          `Job ${job.jobId} (type=${job.jobType}) threw an unhandled error`,
          error instanceof Error ? error.stack : error,
        )
      })
      .finally(() => {
        this.running.delete(job.jobId)
        this.drainQueue()
      })
  }

  /** Try to start queued jobs that now fit under concurrency limits */
  private drainQueue(): void {
    if (this.shuttingDown || this.queue.length === 0) return

    // Walk the queue and start anything that can run
    for (let i = 0; i < this.queue.length; i++) {
      if (this.running.size >= JobManager.MAX_CONCURRENT_GLOBAL) break

      const candidate = this.queue[i]!
      if (this.canRunNow(candidate.userId)) {
        this.queue.splice(i, 1)
        i-- // adjust index after removal
        this.startJob(candidate)
      }
    }
  }
}
