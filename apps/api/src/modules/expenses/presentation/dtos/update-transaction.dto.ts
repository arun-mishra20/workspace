import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator'

const transactionTypes = ['debited', 'credited'] as const
const transactionModes = ['upi', 'credit_card', 'neft', 'imps', 'rtgs'] as const

/**
 * Update Transaction DTO
 *
 * All fields are optional — only provided fields are updated.
 */
export class UpdateTransactionDto {
  @ApiPropertyOptional({ description: 'Corrected merchant name' })
  @IsString()
  @MinLength(1)
  @IsOptional()
  merchant?: string

  @ApiPropertyOptional({ description: 'Corrected category' })
  @IsString()
  @MinLength(1)
  @IsOptional()
  category?: string

  @ApiPropertyOptional({ description: 'Corrected subcategory' })
  @IsString()
  @MinLength(1)
  @IsOptional()
  subcategory?: string

  @ApiPropertyOptional({
    description: 'Transaction type',
    enum: transactionTypes,
  })
  @IsEnum(transactionTypes)
  @IsOptional()
  transactionType?: (typeof transactionTypes)[number]

  @ApiPropertyOptional({
    description: 'Transaction mode',
    enum: transactionModes,
  })
  @IsEnum(transactionModes)
  @IsOptional()
  transactionMode?: (typeof transactionModes)[number]

  @ApiPropertyOptional({ description: 'Corrected amount' })
  @IsNumber()
  @Min(0.01)
  @IsOptional()
  amount?: number

  @ApiPropertyOptional({ description: 'Currency code (e.g. INR)' })
  @IsString()
  @MinLength(1)
  @IsOptional()
  currency?: string

  @ApiPropertyOptional({ description: 'Whether this transaction still needs review' })
  @IsBoolean()
  @IsOptional()
  requiresReview?: boolean
}
