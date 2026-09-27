import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { SALES_STATUSES, type SalesStatus } from './sales-status.js';

/** Highest unit price accepted, in JPY. Keeps totals well inside a PostgreSQL integer. */
export const MAX_PRICE = 9_999_999;

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class CreateProductDto {
  // Only presence and length are checked here. The SKU format rule is a later task (T02).
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  sku: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @IsInt()
  @Min(0)
  @Max(MAX_PRICE)
  price: number;

  @IsIn(SALES_STATUSES)
  salesStatus: SalesStatus;
}

export class UpdateProductDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  sku?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_PRICE)
  price?: number;

  @IsOptional()
  @IsIn(SALES_STATUSES)
  salesStatus?: SalesStatus;
}
