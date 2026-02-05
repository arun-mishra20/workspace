import { Inject, Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";

import { statementsTable, type InsertStatement, type StatementRecord } from "@workspace/database";

import { DB_TOKEN, type DrizzleDb } from "@/shared/infrastructure/db/db.port";
import type { StatementRepository } from "@/modules/expenses/application/ports/statement.repository.port";
import type { Statement } from "@workspace/domain";

@Injectable()
export class StatementRepositoryImpl implements StatementRepository {
    constructor(@Inject(DB_TOKEN) private readonly db: DrizzleDb) {}

    async upsert(statement: Statement): Promise<void> {
        await this.db
            .insert(statementsTable)
            .values(this.toInsert(statement))
            .onConflictDoNothing({ target: statementsTable.id });
    }

    async listByUser(params: { userId: string }): Promise<Statement[]> {
        const records = await this.db
            .select()
            .from(statementsTable)
            .where(eq(statementsTable.userId, params.userId));

        return records.map((record) => this.toDomain(record));
    }

    private toInsert(statement: Statement): InsertStatement {
        return {
            id: statement.id,
            userId: statement.userId,
            issuer: statement.issuer,
            periodStart: statement.periodStart,
            periodEnd: statement.periodEnd,
            totalDue: statement.totalDue.toString(),
            sourceEmailId: statement.sourceEmailId,
        };
    }

    private toDomain(record: StatementRecord): Statement {
        return {
            id: record.id,
            userId: record.userId,
            issuer: record.issuer,
            periodStart: record.periodStart,
            periodEnd: record.periodEnd,
            totalDue: Number(record.totalDue),
            sourceEmailId: record.sourceEmailId,
        };
    }
}
