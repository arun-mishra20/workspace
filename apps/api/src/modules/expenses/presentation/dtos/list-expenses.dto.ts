import { IsOptional, IsString, IsEnum, IsDateString, MaxLength } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

import { OffsetPaginationDto } from "@/shared/infrastructure/dtos/offset-pagination.dto";

const transactionModes = ["upi", "credit_card", "neft", "imps", "rtgs"] as const;

/**
 * List Expenses DTO
 *
 * Extends offset pagination with optional filters for category, mode,
 * review state, date range, and merchant search.
 */
export class ListExpensesDto extends OffsetPaginationDto {
    @ApiPropertyOptional({ description: "Filter by category slug" })
    @IsString()
    @MaxLength(100)
    @IsOptional()
    category?: string;

    @ApiPropertyOptional({
        description: "Filter by transaction mode",
        enum: transactionModes,
    })
    @IsEnum(transactionModes)
    @IsOptional()
    mode?: (typeof transactionModes)[number];

    @ApiPropertyOptional({
        description: "Filter by review state ('true' = needs review, 'false' = reviewed)",
    })
    @IsString()
    @IsOptional()
    review?: string;

    @ApiPropertyOptional({ description: "Start date (inclusive) ISO-8601" })
    @IsDateString()
    @IsOptional()
    date_from?: string;

    @ApiPropertyOptional({ description: "End date (inclusive) ISO-8601" })
    @IsDateString()
    @IsOptional()
    date_to?: string;

    @ApiPropertyOptional({ description: "Search merchant name (case-insensitive contains)" })
    @IsString()
    @MaxLength(200)
    @IsOptional()
    search?: string;
}
