import {
  Injectable,
} from '@nestjs/common'
import { tap } from 'rxjs/operators'

import type {
  NestInterceptor,
  ExecutionContext,
  CallHandler } from '@nestjs/common'
import type { FastifyReply, FastifyRequest } from 'fastify'
import type { Observable } from 'rxjs'

/**
 * Link header interceptor (RFC 8288 Web Linking)
 * Adds pagination links: first, prev, self, next, last
 */
@Injectable()
export class LinkHeaderInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      tap((data: unknown) => {
        if (!this.isListResponse(data)) {
          return
        }

        const httpContext = context.switchToHttp()
        const response = httpContext.getResponse<FastifyReply>()
        const request = httpContext.getRequest<FastifyRequest>()

        const links = this.buildLinks(request, data)
        if (links.length > 0) {
          response.header('Link', links.join(', '))
        }

        // Add total count header for offset pagination
        if (this.isOffsetListResponse(data)) {
          response.header('X-Total-Count', String(data.total))
          const totalPages = Math.ceil(data.total / data.page_size)
          response.header('X-Page-Count', String(totalPages))
        }
      }),
    )
  }

  /**
   * Check if response is a list response
   */
  private isListResponse(data: unknown): data is Record<string, unknown> {
    return (
      typeof data === 'object'
      && data !== null
      && 'object' in data
      && data.object === 'list'
      && 'data' in data
      && Array.isArray(data.data)
    )
  }

  /**
   * Check if response is offset paginated
   */
  private isOffsetListResponse(
    data: unknown,
  ): data is { total: number, page: number, page_size: number, has_more: boolean } {
    return (
      typeof data === 'object'
      && data !== null
      && 'total' in data
      && 'page' in data
      && 'page_size' in data
      && typeof (data as Record<string, unknown>).total === 'number'
    )
  }

  /**
   * Build RFC 8288 Link header array
   */
  private buildLinks(
    request: FastifyRequest,
    data: Record<string, unknown>,
  ): string[] {
    const protocol = request.protocol ?? 'http'
    const host = request.headers.host ?? 'localhost'
    const requestPath = request.url.split('?')[0]
    const baseUrl = `${protocol}://${host}${requestPath}`
    const links: string[] = []

    // Cursor pagination
    if ('next_cursor' in data) {
      if (
        'has_more' in data
        && data.has_more
        && 'next_cursor' in data
        && data.next_cursor
        && typeof data.next_cursor === 'string'
      ) {
        const nextUrl = this.buildUrl(
          baseUrl,
          request.query as Record<string, unknown>,
          {
            cursor: data.next_cursor,
          },
        )
        links.push(`<${nextUrl}>; rel="next"`)
      }

      const selfUrl = this.buildUrl(
        baseUrl,
        request.query as Record<string, unknown>,
      )
      links.push(`<${selfUrl}>; rel="self"`)

      return links
    }

    // Offset pagination
    if (this.isOffsetListResponse(data)) {
      const page = data.page
      const page_size = data.page_size
      const total = data.total
      const totalPages = Math.ceil(total / page_size)
      const hasPrevious = page > 1
      const hasNext = data.has_more

      if (page > 1) {
        const firstUrl = this.buildUrl(
          baseUrl,
          request.query as Record<string, unknown>,
          {
            page: 1,
            page_size,
          },
        )
        links.push(`<${firstUrl}>; rel="first"`)
      }

      if (hasPrevious) {
        const previousUrl = this.buildUrl(
          baseUrl,
          request.query as Record<string, unknown>,
          {
            page: page - 1,
            page_size,
          },
        )
        links.push(`<${previousUrl}>; rel="prev"`)
      }

      const selfUrl = this.buildUrl(
        baseUrl,
        request.query as Record<string, unknown>,
      )
      links.push(`<${selfUrl}>; rel="self"`)

      if (hasNext) {
        const nextUrl = this.buildUrl(
          baseUrl,
          request.query as Record<string, unknown>,
          {
            page: page + 1,
            page_size,
          },
        )
        links.push(`<${nextUrl}>; rel="next"`)
      }

      if (page < totalPages) {
        const lastUrl = this.buildUrl(
          baseUrl,
          request.query as Record<string, unknown>,
          {
            page: totalPages,
            page_size,
          },
        )
        links.push(`<${lastUrl}>; rel="last"`)
      }
    }

    return links
  }

  /**
   * Build URL with query parameters
   */
  private buildUrl(
    baseUrl: string,
    query: Record<string, unknown>,
    overrides: Record<string, string | number> = {},
  ): string {
    const parameters = new URLSearchParams()

    for (const [key, value] of Object.entries(query)) {
      if (key !== 'cursor' && key !== 'page') {
        parameters.set(key, String(value))
      }
    }

    for (const [key, value] of Object.entries(overrides)) {
      parameters.set(key, String(value))
    }

    const queryString = parameters.toString()
    return queryString ? `${baseUrl}?${queryString}` : baseUrl
  }
}
