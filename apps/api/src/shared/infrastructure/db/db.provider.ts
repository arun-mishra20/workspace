import * as schema from "@workspace/database";
import { Logger } from "@nestjs/common";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import type { DrizzleModuleOptions } from "./db.port";

let poolInstance: Pool | null = null;

/**
 * Create Drizzle database instance (singleton)
 *
 * Uses node-postgres connection pool for connection management
 * Provides relational query support using v1 relations syntax
 *
 * @returns Drizzle instance with singleton pool
 */
export function createDrizzleInstance(options: DrizzleModuleOptions) {
    const logger = new Logger("DatabasePool");

    // Return existing pool if already created (singleton pattern)
    if (poolInstance) {
        logger.debug("Reusing existing database pool instance");
        return drizzle({ client: poolInstance, schema });
    }

    logger.log("Creating new database pool instance");

    poolInstance = new Pool({
        connectionString: options.connectionString,
        max: options.pool?.max ?? 10,
        min: options.pool?.min ?? 2,
        idleTimeoutMillis: options.pool?.idleTimeoutMillis ?? 30_000,
        connectionTimeoutMillis: options.pool?.connectionTimeoutMillis ?? 5000,
    });

    // Handle pool errors to prevent unhandled error events from crashing the app
    // This is critical for serverless databases like NeonDB that close idle connections
    poolInstance.on("error", (error, client) => {
        logger.error("Unexpected database pool error", {
            error: error.message,
            stack: error.stack,
            clientId: (client as any)?.processID,
        });
        // Don't throw - let the pool handle reconnection
    });

    // Log pool events for monitoring
    poolInstance.on("connect", (client) => {
        logger.debug(`Database client connected (processID: ${(client as any)?.processID})`);
    });

    poolInstance.on("remove", (client) => {
        logger.debug(`Database client removed (processID: ${(client as any)?.processID})`);
    });

    return drizzle({ client: poolInstance, schema });
}

/**
 * Get the singleton pool instance for graceful shutdown
 * @returns Pool instance or null if not initialized
 */
export function getPoolInstance(): Pool | null {
    return poolInstance;
}

/**
 * Gracefully close the database pool
 * Should be called during application shutdown
 */
export async function closeDatabasePool(): Promise<void> {
    const logger = new Logger("DatabasePool");

    if (poolInstance) {
        logger.log("Closing database pool...");
        await poolInstance.end();
        poolInstance = null;
        logger.log("Database pool closed successfully");
    }
}
