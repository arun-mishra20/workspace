import { ApiProperty } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsInt, IsString, Max, MaxLength, Min } from 'class-validator'

export class FetchPlaygroundEmailsDto {
  @ApiProperty({
    description: 'Gmail query string used to fetch emails for playground preview',
    example: 'subject:(statement OR receipt) newer_than:30d',
    maxLength: 512,
  })
  @IsString()
  @MaxLength(512)
  query!: string

  @ApiProperty({
    description: 'Maximum number of emails to fetch (1-20)',
    minimum: 1,
    maximum: 20,
    example: 10,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  limit!: number
}
