import { IsOptional, IsString, MaxLength } from 'class-validator'

/**
 * Sync Expenses DTO
 *
 * Optional filters for sync operation
 */
export class SyncExpensesDto {
  /**
   * Gmail search query
   * @example subject:(statement OR receipt) newer_than:30d
   */
  @IsString()
  @IsOptional()
  @MaxLength(512)
  query?: string

  /**
   * Provider cursor for incremental sync
   */
  @IsString()
  @IsOptional()
  @MaxLength(512)
  after?: string
}
