import { randomUUID } from "node:crypto";

import { parseTraceparent } from "@/shared/infrastructure/utils/trace-context.util";

import type { FastifyRequest } from "fastify";
import type { ClsModuleOptions, ClsService } from "nestjs-cls";

/**
 * CLS (Continuation-Local Storage) config for request context management
 * Handles: Request ID, Correlation ID, W3C Trace Context, API versioning
 */
export function createClsConfig(): ClsModuleOptions {
    return {
        global: true,
        middleware: {
            mount: true,
            generateId: true,
            idGenerator: (request: FastifyRequest) => {
                // Use client X-Request-Id or generate new UUID
                const requestId = getHeaderValue(request.headers["x-request-id"]);
                return requestId || randomUUID();
            },
            setup: setupClsContext,
        },
    };
}

/**
 * Extract and store tracing info from request headers
 */
function setupClsContext(cls: ClsService, request: FastifyRequest) {
    // Basic request info
    cls.set("userAgent", getHeaderValue(request.headers["user-agent"]));
    cls.set("ip", request.ip);
    cls.set("method", request.method);
    cls.set("url", request.url);

    // Correlation ID for business tracing
    const correlationId = getHeaderValue(request.headers["x-correlation-id"]) || randomUUID();
    cls.set("correlationId", correlationId);

    // W3C Trace Context for distributed tracing
    const traceparent = getHeaderValue(request.headers.traceparent);
    if (traceparent) {
        const traceContext = parseTraceparent(traceparent);
        if (traceContext) {
            cls.set("traceId", traceContext.traceId);
            cls.set("parentId", traceContext.parentId);
            cls.set("traceFlags", traceContext.traceFlags);
        }
    }

    // Optional tracestate
    const tracestate = getHeaderValue(request.headers.tracestate);
    if (tracestate) {
        cls.set("tracestate", tracestate);
    }

    // API version
    const apiVersion =
        getHeaderValue(request.headers["api-version"])
        || getHeaderValue(request.headers["x-api-version"]);
    if (apiVersion) {
        cls.set("apiVersion", apiVersion);
    }
}

function getHeaderValue(header: string | string[] | undefined): string | undefined {
    if (!header) {
        return undefined;
    }
    return Array.isArray(header) ? header[0] : header;
}
