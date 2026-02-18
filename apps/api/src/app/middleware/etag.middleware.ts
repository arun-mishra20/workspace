/**
 * @deprecated This middleware is incompatible with Fastify and has been replaced with @fastify/etag plugin.
 *
 * The custom ETag middleware wrapped res.send which conflicts with Fastify's serialization pipeline.
 * Fastify uses a different response model than Express, and directly mutating res.send causes issues.
 *
 * Migration: Use @fastify/etag plugin registered in main.ts
 *
 * @see https://github.com/fastify/fastify-etag
 * @see main.ts - where @fastify/etag is registered
 */

import * as crypto from 'node:crypto'

import { Injectable } from '@nestjs/common'

import type { NestMiddleware } from '@nestjs/common'
import type { FastifyReply, FastifyRequest } from 'fastify'

/**
 * ETag middleware (RFC 9110 §8.8.3) - DEPRECATED
 * - Generates strong ETag (MD5 hash) for GET/HEAD responses
 * - Handles If-None-Match conditional requests
 * - Returns 304 Not Modified when resource unchanged
 *
 * @deprecated Use @fastify/etag plugin instead
 */
@Injectable()
export class ETagMiddleware implements NestMiddleware {
  use(request: FastifyRequest, res: FastifyReply, next: () => void) {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return next()
    }

    const originalSend = res.send.bind(res) as (body?: unknown) => FastifyReply

    res.send = ((body?: unknown) => {
      return this.handleETag(request, res, body, originalSend)
    }) as typeof res.send

    next()
  }

  /**
     * Generate and validate ETag
     */
  private handleETag(
    request: FastifyRequest,
    res: FastifyReply,
    body: unknown,
    originalSend: (body?: unknown) => FastifyReply,
  ): FastifyReply {
    if (res.sent) {
      return originalSend(body)
    }

    const etag = this.generateETag(body)
    res.header('ETag', etag)

    if (!res.getHeader('Cache-Control')) {
      res.header('Cache-Control', 'max-age=3600') // 1 hour
    }

    const ifNoneMatchHeader = request.headers['if-none-match']
    const ifNoneMatch = Array.isArray(ifNoneMatchHeader)
      ? ifNoneMatchHeader.join(',')
      : ifNoneMatchHeader

    if (ifNoneMatch) {
      const etags = new Set(ifNoneMatch.split(',').map((e) => e.trim()))

      if (etags.has(etag) || etags.has('*')) {
        res.code(304)
        return originalSend()
      }
    }

    return originalSend(body)
  }

  /**
     * Generate strong ETag (MD5 hash)
     */
  private generateETag(data: unknown): string {
    const json = JSON.stringify(data ?? null)
    const hash = crypto.createHash('md5').update(json).digest('hex')

    return `"${hash}"`
  }
}
