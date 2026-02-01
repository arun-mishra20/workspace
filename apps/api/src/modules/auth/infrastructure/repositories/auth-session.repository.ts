import { Inject, Injectable } from "@nestjs/common";
import { sessionsTable } from "@workspace/database";
import { eq, lt } from "drizzle-orm";

import { AuthSessionDto } from "@/modules/auth/application/dtos/auth-session.dto";
import { DB_TOKEN } from "@/shared/infrastructure/db/db.port";

import type { AuthSessionRepository } from "@/modules/auth/application/ports/auth-session.repository.port";
import type { DrizzleDb } from "@/shared/infrastructure/db/db.port";

/**
 * Drizzle AuthSession Repository implementation
 *
 * Manages user session (Refresh Token) persistence
 * Compatible with better-auth schema
 * Anemic design - returns DTOs instead of domain entities
 */
@Injectable()
export class AuthSessionRepositoryImpl implements AuthSessionRepository {
    constructor(
        @Inject(DB_TOKEN)
        private readonly db: DrizzleDb,
    ) {}

    async save(session: AuthSessionDto): Promise<void> {
        const data = {
            id: session.id,
            userId: session.userId,
            token: session.token,
            expiresAt: session.expiresAt,
            ipAddress: session.ipAddress,
            userAgent: session.userAgent,
            createdAt: session.createdAt,
            updatedAt: new Date(),
        };

        const existing = await this.findById(session.id);

        await (existing
            ? this.db
                  .update(sessionsTable)
                  .set({
                      expiresAt: session.expiresAt,
                      updatedAt: new Date(),
                  })
                  .where(eq(sessionsTable.id, session.id))
            : this.db.insert(sessionsTable).values(data));
    }

    async findById(id: string): Promise<AuthSessionDto | null> {
        const result = await this.db
            .select()
            .from(sessionsTable)
            .where(eq(sessionsTable.id, id))
            .limit(1);

        if (result.length === 0) {
            return null;
        }

        return this.toDto(result[0]!);
    }

    async findByToken(token: string): Promise<AuthSessionDto | null> {
        const result = await this.db
            .select()
            .from(sessionsTable)
            .where(eq(sessionsTable.token, token))
            .limit(1);

        if (result.length === 0) {
            return null;
        }

        return this.toDto(result[0]!);
    }

    async findActiveByUserId(userId: string): Promise<AuthSessionDto[]> {
        const now = new Date();
        const results = await this.db
            .select()
            .from(sessionsTable)
            .where(eq(sessionsTable.userId, userId));

        return results
            .map((record) => this.toDto(record))
            .filter((session) => session.expiresAt > now);
    }

    async findAllByUserId(userId: string): Promise<AuthSessionDto[]> {
        const results = await this.db
            .select()
            .from(sessionsTable)
            .where(eq(sessionsTable.userId, userId));

        return results.map((record) => this.toDto(record));
    }

    async delete(id: string): Promise<boolean> {
        const result = await this.db.delete(sessionsTable).where(eq(sessionsTable.id, id));

        return (result.rowCount ?? 0) > 0;
    }

    async deleteAllByUserId(userId: string): Promise<number> {
        const result = await this.db.delete(sessionsTable).where(eq(sessionsTable.userId, userId));

        return result.rowCount ?? 0;
    }

    async deleteExpired(): Promise<number> {
        const result = await this.db
            .delete(sessionsTable)
            .where(lt(sessionsTable.expiresAt, new Date()));

        return result.rowCount ?? 0;
    }

    private toDto(record: typeof sessionsTable.$inferSelect): AuthSessionDto {
        return new AuthSessionDto({
            id: record.id,
            userId: record.userId,
            token: record.token,
            expiresAt: record.expiresAt,
            ipAddress: record.ipAddress ?? null,
            userAgent: record.userAgent ?? null,
            createdAt: record.createdAt,
        });
    }
}
