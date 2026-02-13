import { Inject, Injectable } from "@nestjs/common";
import { and, eq } from "drizzle-orm";

import { merchantCategoryRulesTable } from "@workspace/database";

import { DB_TOKEN, type DrizzleDb } from "@/shared/infrastructure/db/db.port";
import type {
    MerchantCategoryRule,
    MerchantCategoryRuleRepository,
} from "@/modules/expenses/application/ports/merchant-rule.repository.port";

@Injectable()
export class MerchantCategoryRuleRepositoryImpl implements MerchantCategoryRuleRepository {
    constructor(@Inject(DB_TOKEN) private readonly db: DrizzleDb) {}

    async upsert(params: {
        userId: string;
        merchant: string;
        category: string;
        subcategory: string;
        categoryMetadata?: { icon: string; color: string; parent: string | null };
    }): Promise<MerchantCategoryRule> {
        const [row] = await this.db
            .insert(merchantCategoryRulesTable)
            .values({
                userId: params.userId,
                merchant: params.merchant,
                category: params.category,
                subcategory: params.subcategory,
                categoryMetadata: params.categoryMetadata ?? null,
            })
            .onConflictDoUpdate({
                target: [merchantCategoryRulesTable.userId, merchantCategoryRulesTable.merchant],
                set: {
                    category: params.category,
                    subcategory: params.subcategory,
                    categoryMetadata: params.categoryMetadata ?? null,
                    updatedAt: new Date(),
                },
            })
            .returning();

        return this.toModel(row!);
    }

    async findAllByUser(userId: string): Promise<MerchantCategoryRule[]> {
        const rows = await this.db
            .select()
            .from(merchantCategoryRulesTable)
            .where(eq(merchantCategoryRulesTable.userId, userId));

        return rows.map((row) => this.toModel(row));
    }

    async deleteByMerchant(params: { userId: string; merchant: string }): Promise<boolean> {
        const result = await this.db
            .delete(merchantCategoryRulesTable)
            .where(
                and(
                    eq(merchantCategoryRulesTable.userId, params.userId),
                    eq(merchantCategoryRulesTable.merchant, params.merchant),
                ),
            )
            .returning({ id: merchantCategoryRulesTable.id });

        return result.length > 0;
    }

    private toModel(row: typeof merchantCategoryRulesTable.$inferSelect): MerchantCategoryRule {
        return {
            id: row.id,
            userId: row.userId,
            merchant: row.merchant,
            category: row.category,
            subcategory: row.subcategory,
            categoryMetadata: row.categoryMetadata,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
        };
    }
}
