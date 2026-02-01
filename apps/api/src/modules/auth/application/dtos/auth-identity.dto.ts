import type { AuthProvider } from '@/modules/auth/application/constants/auth-provider'

/**
 * AuthIdentity DTO
 *
 * Anemic model - simple data holder
 * All business logic moved to services
 */
export class AuthIdentityDto {
  id: string
  userId: string
  providerId: AuthProvider
  accountId: string
  password: string | null
  accessToken: string | null
  refreshToken: string | null
  accessTokenExpiresAt: Date | null
  refreshTokenExpiresAt: Date | null
  scope: string | null
  createdAt: Date
  updatedAt: Date

  constructor(data: {
    id: string
    userId: string
    providerId: AuthProvider
    accountId: string
    password: string | null
    accessToken: string | null
    refreshToken: string | null
    accessTokenExpiresAt: Date | null
    refreshTokenExpiresAt: Date | null
    scope: string | null
    createdAt: Date
    updatedAt: Date
  }) {
    this.id = data.id
    this.userId = data.userId
    this.providerId = data.providerId
    this.accountId = data.accountId
    this.password = data.password
    this.accessToken = data.accessToken
    this.refreshToken = data.refreshToken
    this.accessTokenExpiresAt = data.accessTokenExpiresAt
    this.refreshTokenExpiresAt = data.refreshTokenExpiresAt
    this.scope = data.scope
    this.createdAt = data.createdAt
    this.updatedAt = data.updatedAt
  }

  /**
   * Alias for compatibility
   */
  get provider(): AuthProvider {
    return this.providerId
  }

  /**
   * Alias for compatibility with code expecting identifier
   */
  get identifier(): string {
    return this.accountId
  }

  /**
   * Alias for compatibility
   */
  get credentialHash(): string | null {
    return this.password
  }
}
