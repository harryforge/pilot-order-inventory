import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export const MAX_ORDER_LINES = 50;
export const MAX_LINE_QUANTITY = 1_000;

export class OrderLineDto {
  @IsInt()
  @Min(1)
  productId: number;

  @IsInt()
  @Min(1)
  @Max(MAX_LINE_QUANTITY)
  quantity: number;
}

export class CreateOrderDto {
  @IsInt()
  @Min(1)
  customerId: number;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_ORDER_LINES)
  @ValidateNested({ each: true })
  @Type(() => OrderLineDto)
  lines: OrderLineDto[];
}

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

/**
 * Search filters of the order list. Each filter is a separate query parameter, so new ones
 * (for example a status filter) can be added without changing the others.
 */
export class ListOrdersQuery {
  /** Part of the order number, case-insensitive. */
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(20)
  orderNumber?: string;

  /** Part of the customer name, case-insensitive. */
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  customer?: string;
}
