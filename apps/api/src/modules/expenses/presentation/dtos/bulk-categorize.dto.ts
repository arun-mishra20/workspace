import {
    IsNotEmpty,
    IsObject,
    IsOptional,
    IsString,
    MinLength,
    ValidateNested,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";

class CategoryMetadataDto {
    @ApiProperty({ description: "Category icon name" })
    @IsString()
    @IsNotEmpty()
    icon!: string;

    @ApiProperty({ description: "Category color hex" })
    @IsString()
    @IsNotEmpty()
    color!: string;

    @ApiProperty({ description: "Parent category", nullable: true })
    @IsString()
    @IsOptional()
    parent!: string | null;
}

/**
 * Bulk Categorize by Merchant DTO
 *
 * Updates category & subcategory for ALL transactions matching a merchant.
 */
export class BulkCategorizeDto {
    @ApiProperty({ description: "Merchant name to match" })
    @IsString()
    @MinLength(1)
    @IsNotEmpty()
    merchant!: string;

    @ApiProperty({ description: "New category to assign" })
    @IsString()
    @MinLength(1)
    @IsNotEmpty()
    category!: string;

    @ApiProperty({ description: "New subcategory to assign" })
    @IsString()
    @MinLength(1)
    @IsNotEmpty()
    subcategory!: string;

    @ApiPropertyOptional({ description: "Category metadata (icon, color, parent)" })
    @IsObject()
    @IsOptional()
    @ValidateNested()
    @Type(() => CategoryMetadataDto)
    categoryMetadata?: CategoryMetadataDto;
}
