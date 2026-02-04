import { Inject, Injectable } from "@nestjs/common";
import { eq, desc, sql } from "drizzle-orm";

import { syncJobsTable, type SyncJobStatus } from "@workspace/database";

import { DB_TOKEN, type DrizzleDb } from "@/shared/infrastructure/db/db.port";
import type {
    SyncJobRepository,
    SyncJob,
    CreateSyncJobParams,
    UpdateSyncJobParams,
} from "@/modules/expenses/application/ports/sync-job.repository.port";

@Injectable()
export class SyncJobRepositoryImpl implements SyncJobRepository {
    constructor(@Inject(DB_TOKEN) private readonly db: DrizzleDb) {}

    async create(params: CreateSyncJobParams): Promise<SyncJob> {
        const [record] = await this.db
            .insert(syncJobsTable)
            .values({
                userId: params.userId,
                query: params.query ?? null,
                status: "pending",
            })
            .returning();

        return this.toDomain(record!);
    }

    async findById(id: string): Promise<SyncJob | null> {
        const [record] = await this.db.select().from(syncJobsTable).where(eq(syncJobsTable.id, id));

        return record ? this.toDomain(record) : null;
    }

    async findByUserId(userId: string, limit = 10): Promise<SyncJob[]> {
        const records = await this.db
            .select()
            .from(syncJobsTable)
            .where(eq(syncJobsTable.userId, userId))
            .orderBy(desc(syncJobsTable.createdAt))
            .limit(limit);

        return records.map((r) => this.toDomain(r));
    }

    async update(id: string, params: UpdateSyncJobParams): Promise<SyncJob | null> {
        const updateData: Record<string, unknown> = {};

        if (params.status !== undefined) updateData.status = params.status;
        if (params.totalEmails !== undefined) updateData.totalEmails = String(params.totalEmails);
        if (params.processedEmails !== undefined)
            updateData.processedEmails = String(params.processedEmails);
        if (params.newEmails !== undefined) updateData.newEmails = String(params.newEmails);
        if (params.transactions !== undefined)
            updateData.transactions = String(params.transactions);
        if (params.statements !== undefined) updateData.statements = String(params.statements);
        if (params.errorMessage !== undefined) updateData.errorMessage = params.errorMessage;
        if (params.startedAt !== undefined) updateData.startedAt = params.startedAt;
        if (params.completedAt !== undefined) updateData.completedAt = params.completedAt;

        const [record] = await this.db
            .update(syncJobsTable)
            .set(updateData)
            .where(eq(syncJobsTable.id, id))
            .returning();

        return record ? this.toDomain(record) : null;
    }

    async incrementProgress(
        id: string,
        field: "processedEmails" | "newEmails" | "transactions" | "statements",
        amount = 1,
    ): Promise<void> {
        // Use separate updates for each field to ensure correct SQL generation
        switch (field) {
            case "processedEmails":
                await this.db
                    .update(syncJobsTable)
                    .set({
                        processedEmails: sql`COALESCE(${syncJobsTable.processedEmails}, '0')::integer + ${amount}`,
                    })
                    .where(eq(syncJobsTable.id, id));
                break;
            case "newEmails":
                await this.db
                    .update(syncJobsTable)
                    .set({
                        newEmails: sql`COALESCE(${syncJobsTable.newEmails}, '0')::integer + ${amount}`,
                    })
                    .where(eq(syncJobsTable.id, id));
                break;
            case "transactions":
                await this.db
                    .update(syncJobsTable)
                    .set({
                        transactions: sql`COALESCE(${syncJobsTable.transactions}, '0')::integer + ${amount}`,
                    })
                    .where(eq(syncJobsTable.id, id));
                break;
            case "statements":
                await this.db
                    .update(syncJobsTable)
                    .set({
                        statements: sql`COALESCE(${syncJobsTable.statements}, '0')::integer + ${amount}`,
                    })
                    .where(eq(syncJobsTable.id, id));
                break;
        }
    }

    private toDomain(record: typeof syncJobsTable.$inferSelect): SyncJob {
        return {
            id: record.id,
            userId: record.userId,
            status: record.status as SyncJobStatus,
            query: record.query,
            totalEmails: record.totalEmails ? Number(record.totalEmails) : null,
            processedEmails: Number(record.processedEmails ?? 0),
            newEmails: Number(record.newEmails ?? 0),
            transactions: Number(record.transactions ?? 0),
            statements: Number(record.statements ?? 0),
            errorMessage: record.errorMessage,
            startedAt: record.startedAt,
            completedAt: record.completedAt,
            createdAt: record.createdAt,
            updatedAt: record.updatedAt,
        };
    }
}
