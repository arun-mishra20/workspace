import { Inject, Injectable } from '@nestjs/common'
import { ruleDashboardsTable } from '@workspace/database'
import {
  CreateRuleDashboardInputSchema,
  DashboardInlineRuleSchema,
  RuleDashboardSchema,
  UpdateRuleDashboardInputSchema,
} from '@workspace/domain'
import { and, desc, eq } from 'drizzle-orm'

import { DB_TOKEN } from '@/shared/infrastructure/db/db.port'

import type { RuleDashboardRepository } from '@/modules/expenses/application/ports/rule-dashboard.repository.port'
import type { DrizzleDb } from '@/shared/infrastructure/db/db.port'
import type {
  CreateRuleDashboardInput,
  RuleDashboard,
  UpdateRuleDashboardInput,
} from '@workspace/domain'

@Injectable()
export class RuleDashboardRepositoryImpl implements RuleDashboardRepository {
  constructor(@Inject(DB_TOKEN) private readonly db: DrizzleDb) {}

  async findAllByUser(userId: string): Promise<RuleDashboard[]> {
    const rows = await this.db
      .select()
      .from(ruleDashboardsTable)
      .where(eq(ruleDashboardsTable.userId, userId))
      .orderBy(desc(ruleDashboardsTable.updatedAt))

    return rows.map((row) => this.toModel(row))
  }

  async findById(params: {
    userId: string
    id: string
  }): Promise<RuleDashboard | null> {
    const [row] = await this.db
      .select()
      .from(ruleDashboardsTable)
      .where(
        and(
          eq(ruleDashboardsTable.userId, params.userId),
          eq(ruleDashboardsTable.id, params.id),
        ),
      )
      .limit(1)

    return row ? this.toModel(row) : null
  }

  async create(params: {
    userId: string
    input: CreateRuleDashboardInput
  }): Promise<RuleDashboard> {
    const parsed = CreateRuleDashboardInputSchema.parse(params.input)

    const [row] = await this.db
      .insert(ruleDashboardsTable)
      .values({
        userId: params.userId,
        name: parsed.name,
        ruleIds: parsed.ruleIds,
        inlineRules: parsed.inlineRules as unknown as Array<{
          id: string
          name: string
          conditions: Record<string, unknown>
        }>,
      })
      .returning()

    if (!row) {
      throw new Error('Failed to create rule dashboard')
    }

    return this.toModel(row)
  }

  async update(params: {
    userId: string
    id: string
    input: UpdateRuleDashboardInput
  }): Promise<RuleDashboard | null> {
    const parsed = UpdateRuleDashboardInputSchema.parse(params.input)

    const setValues: Partial<typeof ruleDashboardsTable.$inferInsert> = {
      updatedAt: new Date(),
    }

    if (parsed.name !== undefined) setValues.name = parsed.name
    if (parsed.ruleIds !== undefined) setValues.ruleIds = parsed.ruleIds
    if (parsed.inlineRules !== undefined) {
      setValues.inlineRules = parsed.inlineRules as unknown as Array<{
        id: string
        name: string
        conditions: Record<string, unknown>
      }>
    }

    const [row] = await this.db
      .update(ruleDashboardsTable)
      .set(setValues)
      .where(
        and(
          eq(ruleDashboardsTable.userId, params.userId),
          eq(ruleDashboardsTable.id, params.id),
        ),
      )
      .returning()

    return row ? this.toModel(row) : null
  }

  async delete(params: { userId: string, id: string }): Promise<boolean> {
    const result = await this.db
      .delete(ruleDashboardsTable)
      .where(
        and(
          eq(ruleDashboardsTable.userId, params.userId),
          eq(ruleDashboardsTable.id, params.id),
        ),
      )
      .returning({ id: ruleDashboardsTable.id })

    return result.length > 0
  }

  private toModel(row: typeof ruleDashboardsTable.$inferSelect): RuleDashboard {
    return RuleDashboardSchema.parse({
      id: row.id,
      userId: row.userId,
      name: row.name,
      ruleIds: row.ruleIds ?? [],
      inlineRules: (row.inlineRules ?? []).map((rule) =>
        DashboardInlineRuleSchema.parse(rule),
      ),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    })
  }
}
