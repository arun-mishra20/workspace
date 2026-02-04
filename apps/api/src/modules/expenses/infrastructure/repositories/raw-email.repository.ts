import { Inject, Injectable } from "@nestjs/common";
import { and, desc, eq } from "drizzle-orm";

import { rawEmailsTable, type InsertRawEmail, type RawEmailRecord } from "@workspace/database";

import { DB_TOKEN, type DrizzleDb } from "@/shared/infrastructure/db/db.port";
import type { RawEmailRepository } from "@/modules/expenses/application/ports/raw-email.repository.port";
import type { RawEmail } from "@workspace/domain";

@Injectable()
export class RawEmailRepositoryImpl implements RawEmailRepository {
    constructor(@Inject(DB_TOKEN) private readonly db: DrizzleDb) {}

    async upsert(email: RawEmail): Promise<{ isNew: boolean; id: string }> {
        const insertData = this.toInsert(email);

        const result = await this.db
            .insert(rawEmailsTable)
            .values(insertData)
            .onConflictDoUpdate({
                target: [
                    rawEmailsTable.userId,
                    rawEmailsTable.provider,
                    rawEmailsTable.providerMessageId,
                ],
                set: {
                    // Only update if content changed (minimal update)
                    updatedAt: new Date(),
                },
            })
            .returning({
                id: rawEmailsTable.id,
                createdAt: rawEmailsTable.createdAt,
                updatedAt: rawEmailsTable.updatedAt,
            });

        const record = result[0]!;
        // If createdAt equals updatedAt (within a small margin), it's a new record
        const isNew = Math.abs(record.createdAt.getTime() - record.updatedAt.getTime()) < 1000;

        return { isNew, id: record.id };
    }

    async findByProviderMessageId(params: {
        userId: string;
        provider: "gmail" | "outlook";
        providerMessageId: string;
    }): Promise<RawEmail | null> {
        const [record] = await this.db
            .select()
            .from(rawEmailsTable)
            .where(
                and(
                    eq(rawEmailsTable.userId, params.userId),
                    eq(rawEmailsTable.provider, params.provider),
                    eq(rawEmailsTable.providerMessageId, params.providerMessageId),
                ),
            );

        return record ? this.toDomain(record) : null;
    }

    async listByUser(params: {
        userId: string;
        limit: number;
        offset: number;
    }): Promise<RawEmail[]> {
        const records = await this.db
            .select()
            .from(rawEmailsTable)
            .where(eq(rawEmailsTable.userId, params.userId))
            .orderBy(desc(rawEmailsTable.receivedAt))
            .limit(params.limit)
            .offset(params.offset);

        return records.map((record) => this.toDomain(record));
    }

    private toInsert(email: RawEmail): InsertRawEmail {
        return {
            id: email.id,
            userId: email.userId,
            provider: email.provider,
            providerMessageId: email.providerMessageId,
            from: email.from,
            subject: email.subject,
            receivedAt: new Date(email.receivedAt),
            bodyText: email.bodyText,
            bodyHtml: email.bodyHtml,
            rawHeaders: email.rawHeaders,
        };
    }

    private toDomain(record: RawEmailRecord): RawEmail {
        return {
            id: record.id,
            userId: record.userId,
            provider: record.provider as "gmail" | "outlook",
            providerMessageId: record.providerMessageId,
            from: record.from,
            subject: record.subject,
            receivedAt: record.receivedAt.toISOString(),
            bodyText: record.bodyText,
            bodyHtml: record.bodyHtml ?? undefined,
            rawHeaders: record.rawHeaders,
        };
    }
}
