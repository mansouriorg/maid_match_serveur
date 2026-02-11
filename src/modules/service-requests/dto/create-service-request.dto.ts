import { 
  IsString, 
  IsNotEmpty, 
  IsInt, 
  IsOptional, 
  IsDateString, 
  Min, 
  IsEmail, 
  IsBoolean, 
  IsArray 
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateServiceRequestDto {
  // --- Customer Info ---
  @IsString()
  @IsNotEmpty()
  customerName: string;

  @IsEmail()
  @IsNotEmpty()
  customerEmail: string;

  @IsString()
  @IsNotEmpty()
  customerPhone: string;

  // --- Property Info ---
  @IsString()
  @IsNotEmpty()
  address: string;

  @IsString()
  @IsNotEmpty()
  propertyType: string; // e.g. "apartment", "villa", "office"

  @IsInt()
  @Min(1)
  @Type(() => Number) // ✅ Auto-convert "3" to 3
  rooms: number;

  @IsInt()
  @Min(1)
  @Type(() => Number) // ✅ Auto-convert "1" to 1
  bathrooms: number;

  @IsString()
  @IsNotEmpty()
  cleaningType: string; // e.g. "standard", "deep"

  @IsBoolean()
  @Type(() => Boolean) // ✅ Auto-convert "true" string to boolean
  hasSupplies: boolean;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  extras?: string[]; // e.g. ["ironing", "pets"]

  // --- Schedule Info ---
  @IsDateString() 
  @IsNotEmpty()
  startTime: string; // ISO String

  @IsInt()
  @Min(1)
  @Type(() => Number) // ✅ Auto-convert "4" to 4
  durationHours: number;

  @IsString()
  @IsNotEmpty()
  frequency: string; // e.g. "one-time", "weekly"

  // --- Admin / System Fields (NEW) ---

  @IsOptional()
  @IsString()
  status?: string; // Allows Admin to create "CONFIRMED" or "ASSIGNED" directly

  @IsOptional()
  @IsInt()
  @Type(() => Number) // ✅ Auto-convert "5" to 5
  maidId?: number; // Allows Admin to immediately assign a maid
}