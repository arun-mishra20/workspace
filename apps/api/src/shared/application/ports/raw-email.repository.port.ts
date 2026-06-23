import type { RawEmail } from '@workspace/domain'

export const EMAIL_SORT_FIELDS = [
  'from',
  'subject',
  'receivedAt',
  'provider',
] as const

export type EmailSortField = (typeof EMAIL_SORT_FIELDS)[number]

export interface RawEmailRepository {
  upsert(email: RawEmail): Promise<{ isNew: boolean, id: string }>
  findById(params: { userId: string, id: string }): Promise<RawEmail | null>
  findByProviderMessageId(params: {
    userId: string
    provider: 'gmail' | 'outlook'
    providerMessageId: string
  }): Promise<RawEmail | null>
  listByUser(params: {
    userId: string
    limit: number
    offset: number
    category?: string
    sortBy?: EmailSortField
    sortOrder?: 'asc' | 'desc'
  }): Promise<RawEmail[]>
  listAllByUser(
    userId: string,
    category?: string,
    options?: { limit?: number, offset?: number },
  ): Promise<RawEmail[]>
  listUnprocessedByUser(
    userId: string,
    category?: string,
    options?: { limit?: number, offset?: number },
  ): Promise<RawEmail[]>
  countByUser(userId: string, category?: string): Promise<number>
}

export const RAW_EMAIL_REPOSITORY = Symbol('RAW_EMAIL_REPOSITORY')
