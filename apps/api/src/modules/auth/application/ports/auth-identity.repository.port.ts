import type { AuthProvider } from '@/modules/auth/application/constants/auth-provider'
import type { AuthIdentityDto } from '@/modules/auth/application/dtos/auth-identity.dto'

/**
 * Auth Identity Repository token
 */
export const AUTH_IDENTITY_REPOSITORY = Symbol('AUTH_IDENTITY_REPOSITORY')

/**
 * Auth Identity Repository interface
 *
 * Manages authentication identities (compatible with better-auth accounts table):
 * - email: Email/password authentication
 * - google/github: OAuth authentication
 * - phone: Phone authentication
 */
export interface AuthIdentityRepository {
  /**
   * Save authentication identity (create or update)
   */
  save(identity: AuthIdentityDto): Promise<void>

  /**
   * Find by ID
   */
  findById(id: string): Promise<AuthIdentityDto | null>

  /**
   * Find all authentication methods by user ID
   */
  findByUserId(userId: string): Promise<AuthIdentityDto[]>

  /**
   * Find by user ID and provider
   */
  findByUserIdAndProvider(userId: string, provider: AuthProvider): Promise<AuthIdentityDto | null>

  /**
   * Find by provider and account ID (for login)
   * accountId: email/OAuth account ID/phone number
   */
  findByProviderAndIdentifier(
    provider: AuthProvider,
    accountId: string,
  ): Promise<AuthIdentityDto | null>

  /**
   * Find by account ID (regardless of provider)
   */
  findByIdentifier(accountId: string): Promise<AuthIdentityDto | null>

  /**
   * Check if account ID exists
   */
  existsByIdentifier(accountId: string): Promise<boolean>

  /**
   * Delete authentication identity
   */
  delete(id: string): Promise<boolean>

  /**
   * Delete all authentication identities for a user
   */
  deleteByUserId(userId: string): Promise<number>
}
