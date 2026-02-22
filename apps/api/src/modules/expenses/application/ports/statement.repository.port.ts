import type { Statement } from '@workspace/domain'

/**
 * Statement Repository interface
 */
export interface StatementRepository {
  upsert(statement: Statement): Promise<void>
  listByUser(params: { userId: string }): Promise<Statement[]>
}

export const STATEMENT_REPOSITORY = Symbol('STATEMENT_REPOSITORY')
