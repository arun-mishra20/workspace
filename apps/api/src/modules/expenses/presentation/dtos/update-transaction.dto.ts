import { ApiPropertyOptional } from '@nestjs/swagger'
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator'

const transactionTypes = ['debited', 'credited'] as const
const transactionModes = ['upi', 'credit_card', 'neft', 'imps', 'rtgs'] as const
const reimbursementStatuses = ['pending', 'settled'] as const

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

  @ApiPropertyOptional({
    description: 'Mark outflow as a pass-through paid for someone else',
  })
  @IsBoolean()
  @IsOptional()
  paidForSomeone?: boolean

  @ApiPropertyOptional({
    description: 'Reimbursement settlement status',
    enum: reimbursementStatuses,
  })
  @IsEnum(reimbursementStatuses)
  @IsOptional()
  reimbursementStatus?: (typeof reimbursementStatuses)[number]

  @ApiPropertyOptional({
    description: 'Linked repayment transaction id, or null to unlink',
    nullable: true,
  })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsUUID()
  @IsOptional()
  linkedReimbursementTxnId?: string | null

  @ApiPropertyOptional({
    description: 'Optional note for the pass-through annotation',
    nullable: true,
  })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @MaxLength(280)
  @IsOptional()
  reimbursementNote?: string | null
}
