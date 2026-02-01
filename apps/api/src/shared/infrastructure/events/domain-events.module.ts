import { Module, Global } from "@nestjs/common";

import { EventPublisher } from "./event-publisher";

/**
 * Events module
 *
 * Global module providing EventPublisher to all modules
 * Simplified from DDD-style domain events to simple application events
 */
@Global()
@Module({
    providers: [EventPublisher],
    exports: [EventPublisher],
})
export class DomainEventsModule {}
