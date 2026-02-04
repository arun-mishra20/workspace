import { IsInt, IsOptional, Max, Min } from "class-validator";

/**
 * List Expense Emails DTO
 */
export class ListExpenseEmailsDto {
  @IsInt()
  @Min(1)
  @Max(200)
  @IsOptional()
  limit?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  offset?: number;
}
