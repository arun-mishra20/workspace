import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsIn, IsOptional, IsString } from 'class-validator'

import { OffsetPaginationDto } from '@/shared/infrastructure/dtos/offset-pagination.dto'

export const EMAIL_SORT_FIELDS = [
  'from',
  'subject',
  'receivedAt',
  'provider',
] as const

export type EmailSortField = (typeof EMAIL_SORT_FIELDS)[number]

export class ListExpenseEmailsDto extends OffsetPaginationDto {
  @ApiPropertyOptional({
    description: 'Sort field',
    enum: EMAIL_SORT_FIELDS,
  })
  @IsString()
  @IsOptional()
  @IsIn(EMAIL_SORT_FIELDS)
  sort_by?: EmailSortField

  @ApiPropertyOptional({ description: 'Sort direction', enum: ['asc', 'desc'] })
  @IsString()
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sort_order?: 'asc' | 'desc'
}
