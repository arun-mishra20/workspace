import { Inject, Injectable, Logger } from "@nestjs/common";
import { and, desc, eq, sql } from "drizzle-orm";

import { rawEmailsTable, type InsertRawEmail } from "@workspace/database";

import { DB_TOKEN, type DrizzleDb } from "@/shared/infrastructure/db/db.port";
import type { RawEmailRepository } from "@/modules/expenses/application/ports/raw-email.repository.port";
import type { RawEmail } from "@workspace/domain";

interface RawEmailReadRecord {
    id: string;
    userId: string;
    provider: string;
    providerMessageId: string;
    from: string;
    subject: string;
    receivedAt: Date;
    bodyText: string;
    bodyHtml: string | null;
    rawHeaders: Record<string, string>;
}

@Injectable()
export class RawEmailRepositoryImpl implements RawEmailRepository {
    private readonly logger = new Logger(RawEmailRepositoryImpl.name);

    constructor(@Inject(DB_TOKEN) private readonly db: DrizzleDb) {}

    async upsert(email: RawEmail): Promise<{ isNew: boolean; id: string }> {
        const insertData = this.toInsert(email);
        this.logger.debug(
            `Attempting to upsert email: userId=${email.userId}, provider=${email.provider}, providerMessageId=${email.providerMessageId}`,
        );

        try {
            // Try using the unique constraint (if it exists)
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

            this.logger.debug(`Upsert with constraint successful: id=${record.id}, isNew=${isNew}`);
            return { isNew, id: record.id };
        } catch (error) {
            this.logger.warn(`Upsert with constraint failed, using fallback: ${error}`);
            // Fallback: Check if email exists, then insert or return existing
            const existing = await this.findByProviderMessageId({
                userId: email.userId,
                provider: email.provider,
                providerMessageId: email.providerMessageId,
            });

            if (existing) {
                this.logger.debug(`Email already exists: id=${existing.id}`);
                return { isNew: false, id: existing.id };
            }

            // Insert new record
            this.logger.debug(`Inserting new email`);
            const result = await this.db
                .insert(rawEmailsTable)
                .values(insertData)
                .returning({ id: rawEmailsTable.id });

            const newId = result[0]!.id;
            this.logger.debug(`Inserted new email: id=${newId}`);
            return { isNew: true, id: newId };
        }
    }

    async findById(params: { userId: string; id: string }): Promise<RawEmail | null> {
        const [record] = await this.db
            .select(this.selectFields())
            .from(rawEmailsTable)
            .where(and(eq(rawEmailsTable.userId, params.userId), eq(rawEmailsTable.id, params.id)));

        return record ? this.toDomain(record) : null;
    }

    async findByProviderMessageId(params: {
        userId: string;
        provider: "gmail" | "outlook";
        providerMessageId: string;
    }): Promise<RawEmail | null> {
        const [record] = await this.db
            .select(this.selectFields())
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
        this.logger.debug(
            `Listing emails for user ${params.userId}, limit: ${params.limit}, offset: ${params.offset}`,
        );

        const records = await this.db
            .select(this.selectFields())
            .from(rawEmailsTable)
            .where(eq(rawEmailsTable.userId, params.userId))
            .orderBy(desc(rawEmailsTable.receivedAt))
            .limit(params.limit)
            .offset(params.offset);

        this.logger.debug(`Found ${records.length} emails for user ${params.userId}`);
        return records.map((record) => this.toDomain(record));
    }

    async listAllByUser(userId: string): Promise<RawEmail[]> {
        this.logger.debug(`Listing ALL emails for user ${userId} (reprocess)`);

        const records = await this.db
            .select(this.selectFields())
            .from(rawEmailsTable)
            .where(eq(rawEmailsTable.userId, userId))
            .orderBy(desc(rawEmailsTable.receivedAt));

        this.logger.debug(`Found ${records.length} total emails for user ${userId}`);
        return records.map((record) => this.toDomain(record));
    }

    async countByUser(userId: string): Promise<number> {
        const result = await this.db
            .select({ count: sql<number>`count(*)::int` })
            .from(rawEmailsTable)
            .where(eq(rawEmailsTable.userId, userId));

        return result[0]?.count ?? 0;
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

    private selectFields() {
        return {
            id: rawEmailsTable.id,
            userId: rawEmailsTable.userId,
            provider: rawEmailsTable.provider,
            providerMessageId: rawEmailsTable.providerMessageId,
            from: rawEmailsTable.from,
            subject: rawEmailsTable.subject,
            receivedAt: rawEmailsTable.receivedAt,
            bodyText: rawEmailsTable.bodyText,
            bodyHtml: rawEmailsTable.bodyHtml,
            rawHeaders: rawEmailsTable.rawHeaders,
        };
    }

    private toDomain(record: RawEmailReadRecord): RawEmail {
        return {
            id: record.id,
            userId: record.userId,
            provider: record.provider as "gmail" | "outlook",
            providerMessageId: record.providerMessageId,
            from: record.from,
            subject: record.subject,
            snippet: this.deriveSnippet(record.bodyText),
            receivedAt: record.receivedAt.toISOString(),
            bodyText: record.bodyText,
            bodyHtml: record.bodyHtml ?? undefined,
            rawHeaders: record.rawHeaders,
        };
    }

    private deriveSnippet(bodyText: string): string {
        const snippet = bodyText.replace(/\s+/g, " ").trim();
        return snippet.slice(0, 180);
    }
}
