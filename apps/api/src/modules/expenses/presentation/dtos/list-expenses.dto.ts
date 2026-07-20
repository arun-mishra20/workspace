import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString, IsEnum, IsDateString, MaxLength, Matches, IsIn } from 'class-validator'

import { TRANSACTION_SORT_FIELDS } from '@/modules/expenses/application/ports/transaction.repository.port'

import { OffsetPaginationDto } from '@/shared/infrastructure/dtos/offset-pagination.dto'

const transactionModes = ['upi', 'credit_card', 'neft', 'imps', 'rtgs'] as const

/**
 * List Expenses DTO
 *
 * Extends offset pagination with optional filters for category, mode,
 * review state, date range, and merchant search.
 */
export class ListExpensesDto extends OffsetPaginationDto {
  @ApiPropertyOptional({ description: 'Filter by category slug' })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  category?: string

  @ApiPropertyOptional({ description: 'Filter by subcategory slug' })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  subcategory?: string

  @ApiPropertyOptional({
    description: 'Filter by transaction mode',
    enum: transactionModes,
  })
  @IsEnum(transactionModes)
  @IsOptional()
  mode?: (typeof transactionModes)[number]

  @ApiPropertyOptional({
    description: 'Filter by categorization method (e.g. default, manual, merchant_rule)',
  })
  @IsString()
  @MaxLength(50)
  @IsOptional()
  categorization_method?: string

  @ApiPropertyOptional({
    description: 'Filter by review state (\'true\' = needs review, \'false\' = reviewed)',
  })
  @IsString()
  @IsOptional()
  review?: string

  @ApiPropertyOptional({
    description:
      "Filter paid-for-someone annotations: 'true' (any), 'pending', or 'settled'",
    enum: ['true', 'pending', 'settled'],
  })
  @IsString()
  @IsOptional()
  @IsIn(['true', 'pending', 'settled'])
  paid_for_someone?: 'true' | 'pending' | 'settled'

  @ApiPropertyOptional({ description: 'Start date (inclusive) ISO-8601' })
  @IsDateString()
  @IsOptional()
  date_from?: string

  @ApiPropertyOptional({ description: 'End date (inclusive) ISO-8601' })
  @IsDateString()
  @IsOptional()
  date_to?: string

  @ApiPropertyOptional({ description: 'Search merchant name (case-insensitive contains)' })
  @IsString()
  @MaxLength(200)
  @IsOptional()
  search?: string

  @ApiPropertyOptional({ description: 'Filter by credit card last 4 digits' })
  @IsString()
  @Matches(/^\d{4}$/)
  @IsOptional()
  card_last4?: string

  @ApiPropertyOptional({
    description: 'Sort field',
    enum: [
      'transactionDate',
      'merchant',
      'amount',
      'category',
      'subcategory',
      'transactionMode',
      'categorizationMethod',
      'confidence',
      'requiresReview',
    ],
  })
  @IsString()
  @IsOptional()
  @IsIn(TRANSACTION_SORT_FIELDS)
  sort_by?: string

  @ApiPropertyOptional({ description: 'Sort direction', enum: ['asc', 'desc'] })
  @IsString()
  @IsOptional()
  sort_order?: 'asc' | 'desc'
}
