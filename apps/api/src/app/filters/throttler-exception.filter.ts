import { Catch, Logger } from "@nestjs/common";
import { ThrottlerException } from "@nestjs/throttler";
import { ClsService } from "nestjs-cls";

import type { ProblemDetailsDto } from "@/shared/infrastructure/dtos/problem-details.dto";
import type { ExceptionFilter, ArgumentsHost } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";

/**
 * Throttler exception filter (RFC 6585 §4, RFC 9457)
 * Adds Retry-After and X-RateLimit-* headers
 */
@Catch(ThrottlerException)
export class ThrottlerExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(ThrottlerExceptionFilter.name);

    constructor(private readonly cls: ClsService) {}

    catch(_exception: ThrottlerException, host: ArgumentsHost) {
        const context = host.switchToHttp();
        const response = context.getResponse<FastifyReply>();
        const request = context.getRequest<FastifyRequest>();

        const ttl = 60; // 60 seconds
        const limit = 100; // 10 requests per minute
        const resetTime = Math.floor(Date.now() / 1000) + ttl;

        // RFC 6585 §4: Retry-After header (required)
        response.header("Retry-After", ttl.toString());

        // IETF Rate Limit Headers draft
        response.header("X-RateLimit-Limit", limit.toString());
        response.header("X-RateLimit-Remaining", "0");
        response.header("X-RateLimit-Reset", resetTime.toString());

        response.header("Content-Type", "application/problem+json");

        const problemDetails: ProblemDetailsDto = {
            type: `${process.env.API_BASE_URL ?? "https://api.example.com"}/errors/rate-limit-exceeded`,
            title: "Rate Limit Exceeded",
            status: 429,
            detail: `You have sent ${limit} requests in ${ttl} seconds. Please retry later.`,
            instance: request.url,
            request_id: this.cls.getId(),
            correlation_id: this.cls.get("correlationId"),
            trace_id: this.cls.get("traceId"),
            timestamp: new Date().toISOString(),
        };

        this.logger.warn(`Rate limit exceeded: ${request.method} ${request.url} - ${request.ip}`);

        response.code(429).send(problemDetails);
    }
}
