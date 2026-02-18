import { Inject, Injectable } from '@nestjs/common'
import { accountsTable } from '@workspace/database'
import { eq, and } from 'drizzle-orm'

import { AuthIdentityDto } from '@/modules/auth/application/dtos/auth-identity.dto'
import { DB_TOKEN } from '@/shared/infrastructure/db/db.port'

import type { AuthProvider } from '@/modules/auth/application/constants/auth-provider'
import type { AuthIdentityRepository } from '@/modules/auth/application/ports/auth-identity.repository.port'
import type { DrizzleDb } from '@/shared/infrastructure/db/db.port'

/**
 * Drizzle AuthIdentity Repository implementation
 *
 * Manages persistence of multi-method authentication identities
 * Compatible with better-auth accounts table
 * Anemic design - returns DTOs instead of domain entities
 */
@Injectable()
export class AuthIdentityRepositoryImpl implements AuthIdentityRepository {
  constructor(
    @Inject(DB_TOKEN)
    private readonly db: DrizzleDb,
  ) {}

  async save(identity: AuthIdentityDto): Promise<void> {
    const data = {
      id: identity.id,
      userId: identity.userId,
      providerId: identity.providerId,
      accountId: identity.accountId,
      password: identity.password,
      accessToken: identity.accessToken,
      refreshToken: identity.refreshToken,
      accessTokenExpiresAt: identity.accessTokenExpiresAt,
      refreshTokenExpiresAt: identity.refreshTokenExpiresAt,
      scope: identity.scope,
      updatedAt: identity.updatedAt,
    }

    const existing = await this.findById(identity.id)

    await (existing
      ? this.db.update(accountsTable).set(data).where(eq(accountsTable.id, identity.id))
      : this.db.insert(accountsTable).values({
          ...data,
          createdAt: identity.createdAt,
        }))
  }

  async findById(id: string): Promise<AuthIdentityDto | null> {
    const result = await this.db
      .select()
      .from(accountsTable)
      .where(eq(accountsTable.id, id))
      .limit(1)

    if (result.length === 0) {
      return null
    }

    return this.toDto(result[0]!)
  }

  async findByUserId(userId: string): Promise<AuthIdentityDto[]> {
    const results = await this.db
      .select()
      .from(accountsTable)
      .where(eq(accountsTable.userId, userId))

    return results.map((record) => this.toDto(record))
  }

  async findByUserIdAndProvider(
    userId: string,
    provider: AuthProvider,
  ): Promise<AuthIdentityDto | null> {
    const result = await this.db
      .select()
      .from(accountsTable)
      .where(and(eq(accountsTable.userId, userId), eq(accountsTable.providerId, provider)))
      .limit(1)

    if (result.length === 0) {
      return null
    }

    return this.toDto(result[0]!)
  }

  async findByProviderAndIdentifier(
    provider: AuthProvider,
    accountId: string,
  ): Promise<AuthIdentityDto | null> {
    const result = await this.db
      .select()
      .from(accountsTable)
      .where(
        and(
          eq(accountsTable.providerId, provider),
          eq(accountsTable.accountId, accountId.toLowerCase()),
        ),
      )
      .limit(1)

    if (result.length === 0) {
      return null
    }

    return this.toDto(result[0]!)
  }

  async findByIdentifier(accountId: string): Promise<AuthIdentityDto | null> {
    const result = await this.db
      .select()
      .from(accountsTable)
      .where(eq(accountsTable.accountId, accountId.toLowerCase()))
      .limit(1)

    if (result.length === 0) {
      return null
    }

    return this.toDto(result[0]!)
  }

  async existsByIdentifier(accountId: string): Promise<boolean> {
    const result = await this.db
      .select({ id: accountsTable.id })
      .from(accountsTable)
      .where(eq(accountsTable.accountId, accountId.toLowerCase()))
      .limit(1)

    return result.length > 0
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db.delete(accountsTable).where(eq(accountsTable.id, id))

    return (result.rowCount ?? 0) > 0
  }

  async deleteByUserId(userId: string): Promise<number> {
    const result = await this.db.delete(accountsTable).where(eq(accountsTable.userId, userId))

    return result.rowCount ?? 0
  }

  private toDto(record: typeof accountsTable.$inferSelect): AuthIdentityDto {
    return new AuthIdentityDto({
      id: record.id,
      userId: record.userId,
      providerId: record.providerId as AuthProvider,
      accountId: record.accountId,
      password: record.password,
      accessToken: record.accessToken,
      refreshToken: record.refreshToken,
      accessTokenExpiresAt: record.accessTokenExpiresAt,
      refreshTokenExpiresAt: record.refreshTokenExpiresAt,
      scope: record.scope,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    })
  }
}
