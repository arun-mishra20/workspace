import { Injectable } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'

/**
 * Base event interface for all application events
 */
export interface AppEvent {
  /** Event type identifier */
  readonly eventType: string
  /** When the event occurred */
  readonly occurredAt: Date
  /** Optional correlation ID for tracing */
  readonly correlationId?: string
}

/**
 * Event publisher service
 *
 * Simple event publisher for application events
 * Replaces DDD-style domain event publisher
 */
@Injectable()
export class EventPublisher {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  /**
     * Publish an event
     */
  async publish<T extends AppEvent>(event: T): Promise<void> {
    console.log(`[Event] Publishing: ${event.eventType}`, {
      occurredAt: event.occurredAt,
      correlationId: event.correlationId,
    })

    await this.eventEmitter.emitAsync(event.eventType, event)
  }

  /**
     * Publish multiple events
     */
  async publishAll<T extends AppEvent>(events: T[]): Promise<void> {
    for (const event of events) {
      await this.publish(event)
    }
  }
}
