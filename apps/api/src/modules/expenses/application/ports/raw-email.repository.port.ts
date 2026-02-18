import type { RawEmail } from '@workspace/domain'

/**
 * Raw Email Repository interface
 *
 * Stores raw email payloads for reprocessing
 */
export interface RawEmailRepository {
  upsert(email: RawEmail): Promise<{ isNew: boolean, id: string }>
  findById(params: { userId: string, id: string }): Promise<RawEmail | null>
  findByProviderMessageId(params: {
    userId: string
    provider: 'gmail' | 'outlook'
    providerMessageId: string
  }): Promise<RawEmail | null>
  listByUser(params: { userId: string, limit: number, offset: number, category?: string }): Promise<RawEmail[]>
  listAllByUser(
    userId: string,
    category?: string,
    options?: { limit?: number, offset?: number },
  ): Promise<RawEmail[]>
  /**
   * Find emails that haven't been processed yet (no transactions created from them)
   */
  listUnprocessedByUser(
    userId: string,
    category?: string,
    options?: { limit?: number, offset?: number },
  ): Promise<RawEmail[]>
  countByUser(userId: string, category?: string): Promise<number>
}

export const RAW_EMAIL_REPOSITORY = Symbol('RAW_EMAIL_REPOSITORY')
