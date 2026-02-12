import {
    ArrayMinSize,
    IsArray,
    IsBoolean,
    IsEnum,
    IsOptional,
    IsString,
    MinLength,
    ValidateNested,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";

const transactionModes = ["upi", "credit_card", "neft", "imps", "rtgs"] as const;

/**
 * Fields that can be updated in bulk.
 * Intentionally a subset of UpdateTransactionDto — no merchant / amount / currency
 * to prevent accidental mass data corruption.
 */
class BulkUpdateFieldsDto {
    @ApiPropertyOptional({ description: "Category to assign" })
    @IsString()
    @MinLength(1)
    @IsOptional()
    category?: string;

    @ApiPropertyOptional({ description: "Subcategory to assign" })
    @IsString()
    @IsOptional()
    subcategory?: string;

    @ApiPropertyOptional({ description: "Transaction mode" })
    @IsEnum(transactionModes)
    @IsOptional()
    transactionMode?: (typeof transactionModes)[number];

    @ApiPropertyOptional({ description: "Whether transactions still need review" })
    @IsBoolean()
    @IsOptional()
    requiresReview?: boolean;
}

/**
 * Bulk-update DTO: update multiple transactions by ID in one request.
 */
export class BulkUpdateTransactionsDto {
    @ApiProperty({
        description: "Transaction IDs to update",
        type: [String],
        minItems: 1,
    })
    @IsArray()
    @IsString({ each: true })
    @ArrayMinSize(1)
    ids!: string[];

    @ApiProperty({ description: "Fields to set on all selected transactions" })
    @ValidateNested()
    @Type(() => BulkUpdateFieldsDto)
    data!: BulkUpdateFieldsDto;
}
