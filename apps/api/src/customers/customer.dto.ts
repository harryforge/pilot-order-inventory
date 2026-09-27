import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

/** Digits with optional `+`, `-`, spaces or brackets, for example `03-0000-0001`. */
export const PHONE_PATTERN = /^\+?[0-9][0-9\- ()]{5,19}$/;

export class CreateCustomerDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  address: string;

  @Transform(trim)
  @IsString()
  @MaxLength(20)
  @Matches(PHONE_PATTERN, { message: 'phone must contain digits and may use + - ( ) or spaces' })
  phone: string;
}
