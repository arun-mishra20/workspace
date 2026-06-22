import { Inject, Injectable } from '@nestjs/common'
import { categorizationRulesTable } from '@workspace/database'
import {
  CategorizationRuleSchema,
  CreateCategorizationRuleInputSchema,
  RuleActionSchema,
  RuleConditionGroupSchema,
  UpdateCategorizationRuleInputSchema,
} from '@workspace/domain'
import { and, asc, desc, eq, sql } from 'drizzle-orm'

import { DB_TOKEN } from '@/shared/infrastructure/db/db.port'

import type {
  CategorizationRuleRepository,
} from '@/modules/expenses/application/ports/categorization-rule.repository.port'
import type { DrizzleDb } from '@/shared/infrastructure/db/db.port'
import type {
  CategorizationRule,
  CreateCategorizationRuleInput,
  UpdateCategorizationRuleInput,
} from '@workspace/domain'

@Injectable()
export class CategorizationRuleRepositoryImpl implements CategorizationRuleRepository {
  constructor(@Inject(DB_TOKEN) private readonly db: DrizzleDb) {}

  async findAllByUser(userId: string): Promise<CategorizationRule[]> {
    const rows = await this.db
      .select()
      .from(categorizationRulesTable)
      .where(eq(categorizationRulesTable.userId, userId))
      .orderBy(asc(categorizationRulesTable.priority), desc(categorizationRulesTable.createdAt))

    return rows.map((row) => this.toModel(row))
  }

  async findEnabledByUser(userId: string): Promise<CategorizationRule[]> {
    const rows = await this.db
      .select()
      .from(categorizationRulesTable)
      .where(
        and(
          eq(categorizationRulesTable.userId, userId),
          eq(categorizationRulesTable.enabled, true),
        ),
      )
      .orderBy(asc(categorizationRulesTable.priority), desc(categorizationRulesTable.createdAt))

    return rows.map((row) => this.toModel(row))
  }

  async findById(params: {
    userId: string
    id: string
  }): Promise<CategorizationRule | null> {
    const [row] = await this.db
      .select()
      .from(categorizationRulesTable)
      .where(
        and(
          eq(categorizationRulesTable.userId, params.userId),
          eq(categorizationRulesTable.id, params.id),
        ),
      )
      .limit(1)

    return row ? this.toModel(row) : null
  }

  async create(params: {
    userId: string
    input: CreateCategorizationRuleInput
    priority: number
  }): Promise<CategorizationRule> {
    const parsed = CreateCategorizationRuleInputSchema.parse(params.input)

    const [row] = await this.db
      .insert(categorizationRulesTable)
      .values({
        userId: params.userId,
        name: parsed.name,
        enabled: parsed.enabled ?? true,
        priority: params.priority,
        conditions: parsed.conditions as unknown as Record<string, unknown>,
        action: parsed.action as unknown as Record<string, unknown>,
      })
      .returning()

    if (!row) {
      throw new Error('Failed to create categorization rule')
    }

    return this.toModel(row)
  }

  async update(params: {
    userId: string
    id: string
    input: UpdateCategorizationRuleInput
  }): Promise<CategorizationRule | null> {
    const parsed = UpdateCategorizationRuleInputSchema.parse(params.input)

    const setValues: Partial<typeof categorizationRulesTable.$inferInsert> = {
      updatedAt: new Date(),
    }

    if (parsed.name !== undefined) setValues.name = parsed.name
    if (parsed.enabled !== undefined) setValues.enabled = parsed.enabled
    if (parsed.priority !== undefined) setValues.priority = parsed.priority
    if (parsed.conditions !== undefined) {
      setValues.conditions = parsed.conditions as unknown as Record<string, unknown>
    }
    if (parsed.action !== undefined) {
      setValues.action = parsed.action as unknown as Record<string, unknown>
    }

    const [row] = await this.db
      .update(categorizationRulesTable)
      .set(setValues)
      .where(
        and(
          eq(categorizationRulesTable.userId, params.userId),
          eq(categorizationRulesTable.id, params.id),
        ),
      )
      .returning()

    return row ? this.toModel(row) : null
  }

  async delete(params: { userId: string, id: string }): Promise<boolean> {
    const result = await this.db
      .delete(categorizationRulesTable)
      .where(
        and(
          eq(categorizationRulesTable.userId, params.userId),
          eq(categorizationRulesTable.id, params.id),
        ),
      )
      .returning({ id: categorizationRulesTable.id })

    return result.length > 0
  }

  async reorderPriorities(params: {
    userId: string
    orderedIds: string[]
  }): Promise<CategorizationRule[]> {
    await Promise.all(
      params.orderedIds.map((id, index) =>
        this.db
          .update(categorizationRulesTable)
          .set({ priority: index, updatedAt: new Date() })
          .where(
            and(
              eq(categorizationRulesTable.userId, params.userId),
              eq(categorizationRulesTable.id, id),
            ),
          ),
      ),
    )

    return this.findAllByUser(params.userId)
  }

  async incrementHitCount(params: {
    userId: string
    id: string
    matchedCount: number
  }): Promise<void> {
    await this.db
      .update(categorizationRulesTable)
      .set({
        hitCount: sql`${categorizationRulesTable.hitCount} + ${params.matchedCount}`,
        lastMatchedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(categorizationRulesTable.userId, params.userId),
          eq(categorizationRulesTable.id, params.id),
        ),
      )
  }

  private toModel(row: typeof categorizationRulesTable.$inferSelect): CategorizationRule {
    return CategorizationRuleSchema.parse({
      id: row.id,
      userId: row.userId,
      name: row.name,
      enabled: row.enabled,
      priority: row.priority,
      conditions: RuleConditionGroupSchema.parse(row.conditions),
      action: RuleActionSchema.parse(row.action),
      hitCount: row.hitCount,
      lastMatchedAt: row.lastMatchedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    })
  }
}
