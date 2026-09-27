import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

/** Largest quantity accepted in one movement. */
export const MAX_MOVEMENT_QUANTITY = 100_000;

export class StockMovementDto {
  @IsInt()
  @Min(1)
  productId: number;

  @IsInt()
  @Min(1)
  @Max(MAX_MOVEMENT_QUANTITY)
  quantity: number;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(200)
  note?: string;
}
