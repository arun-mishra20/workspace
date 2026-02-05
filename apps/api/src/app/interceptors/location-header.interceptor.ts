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
 * Location header interceptor (RFC 9110 §15.3.2)
 * Adds Location header to 201 Created responses
 */
@Injectable()
export class LocationHeaderInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      tap((data: unknown) => {
        const httpContext = context.switchToHttp()
        const response = httpContext.getResponse<FastifyReply>()
        const request = httpContext.getRequest<FastifyRequest>()

        // Only handle 201 Created responses
        if (response.statusCode !== 201) {
          return
        }

        // Check if response has id field
        if (
          !data
          || typeof data !== 'object'
          || !('id' in data)
          || typeof data.id !== 'string'
        ) {
          return
        }

        const protocol = request.protocol ?? 'http'
        const host = request.headers.host ?? 'localhost'
        const requestPath = request.url.split('?')[0] ?? request.url
        const baseUrl = `${protocol}://${host}`
        const resourcePath = this.buildResourcePath(requestPath, data.id)

        response.header('Location', `${baseUrl}${resourcePath}`)
      }),
    )
  }

  /**
   * Build resource path
   */
  private buildResourcePath(requestPath: string, resourceId: string): string {
    const cleanPath = requestPath.replace(/\/$/, '')
    return `${cleanPath}/${resourceId}`
  }
}
