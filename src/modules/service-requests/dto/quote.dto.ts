import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

// What the public booking form sends to get a price estimate
// (POST /service-requests/quote). Nothing is saved.
export class QuoteDto {
  @IsString()
  @IsNotEmpty()
  cleaningType: string; // "standard" or "deep"

  @IsInt()
  @Min(1)
  @Max(24)
  @Type(() => Number)
  durationHours: number;

  @IsBoolean()
  hasSupplies: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  extras?: string[];
}
