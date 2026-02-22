import { Injectable } from '@nestjs/common'

import type { ProblemDetailsDto } from '@/shared/infrastructure/dtos/problem-details.dto'
import type { NestMiddleware } from '@nestjs/common'
import type { IncomingMessage, ServerResponse } from 'node:http'

/**
 * API version control middleware (Google AIP-185, Stripe-style)
 * - Uses API-Version header with date-based versions (e.g., 2024-11-01)
 * - Defaults to latest version if not specified
 * - Echoes version in response header
 */
@Injectable()
export class ApiVersionMiddleware implements NestMiddleware {
  private readonly DEFAULT_VERSION = '2024-11-01'

  private readonly SUPPORTED_VERSIONS = [
    '2024-11-01', // Current version
  ]

  private readonly RETIRED_VERSIONS: string[] = []

  use(request: IncomingMessage & { apiVersion?: string }, res: ServerResponse, next: () => void) {
    const headerVersion = request.headers['api-version']
    let version = Array.isArray(headerVersion) ? headerVersion[0] : headerVersion

    if (!version) {
      version = this.DEFAULT_VERSION
    }

    if (this.RETIRED_VERSIONS.includes(version)) {
      return this.handleRetiredVersion(request, res, version)
    }

    if (!this.SUPPORTED_VERSIONS.includes(version)) {
      return this.handleUnsupportedVersion(request, res, version)
    }

    request.apiVersion = version
    res.setHeader('API-Version', version)

    next()
  }

  /**
     * Handle unsupported version (400 Bad Request)
     */
  private handleUnsupportedVersion(request: IncomingMessage, res: ServerResponse, version: string) {
    const problemDetails: ProblemDetailsDto = {
      type: `${process.env.API_BASE_URL ?? 'https://api.example.com'}/errors/unsupported-api-version`,
      title: 'Unsupported API Version',
      status: 400,
      detail: `API version ${version} is not supported. Please use a supported version.`,
      instance: request.url ?? '/',
      timestamp: new Date().toISOString(),
    }

    const extendedDetails = problemDetails as ProblemDetailsDto & {
      supported_versions?: string[]
      latest_version?: string
    }
    extendedDetails.supported_versions = this.SUPPORTED_VERSIONS
    extendedDetails.latest_version = this.DEFAULT_VERSION

    res.statusCode = 400
    res.setHeader('Content-Type', 'application/problem+json')
    res.end(JSON.stringify(problemDetails))
  }

  /**
     * Handle retired version (410 Gone)
     */
  private handleRetiredVersion(request: IncomingMessage, res: ServerResponse, version: string) {
    const problemDetails: ProblemDetailsDto = {
      type: `${process.env.API_BASE_URL ?? 'https://api.example.com'}/errors/version-retired`,
      title: 'API Version Retired',
      status: 410,
      detail: `API version ${version} has been permanently retired.`,
      instance: request.url ?? '/',
      timestamp: new Date().toISOString(),
    }

    const extendedDetails = problemDetails as ProblemDetailsDto & {
      retired_version?: string
      current_version?: string
      migration_guide?: string
    }
    extendedDetails.retired_version = version
    extendedDetails.current_version = this.DEFAULT_VERSION
    extendedDetails.migration_guide = `${process.env.API_BASE_URL ?? 'https://api.example.com'}/migration/${version}-to-${this.DEFAULT_VERSION}`

    res.statusCode = 410
    res.setHeader('Content-Type', 'application/problem+json')
    res.end(JSON.stringify(problemDetails))
  }
}
