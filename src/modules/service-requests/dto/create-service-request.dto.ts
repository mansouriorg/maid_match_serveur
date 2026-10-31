import {
  IsString,
  IsNotEmpty,
  IsInt,
  IsOptional,
  IsDateString,
  Min,
  IsEmail,
  IsBoolean,
  IsArray,
  IsNumber,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import * as xss from 'xss'; // <-- Import de la bibliothèque de sécurité

export class CreateServiceRequestDto {
  // --- Customer Info ---
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? xss.filterXSS(value.trim()) : value,
  )
  customerName: string;

  @IsEmail()
  @IsNotEmpty()
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value === 'string') {
      return xss.filterXSS(value.trim().toLowerCase()); // Nettoyage + minuscules
    }
    return value;
  })
  customerEmail: string;

  @IsString()
  @IsNotEmpty()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? xss.filterXSS(value.trim()) : value,
  )
  customerPhone: string;

  // --- Property Info ---
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? xss.filterXSS(value.trim()) : value,
  )
  address: string;

  @IsString()
  @IsNotEmpty()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? xss.filterXSS(value.trim()) : value,
  )
  propertyType: string; // e.g. "apartment", "villa", "office"

  @IsInt()
  @Min(1)
  @Type(() => Number) // Auto-convert "3" to 3
  rooms: number;

  @IsInt()
  @Min(1)
  @Type(() => Number) // Auto-convert "1" to 1
  bathrooms: number;

  @IsString()
  @IsNotEmpty()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? xss.filterXSS(value.trim()) : value,
  )
  cleaningType: string; // e.g. "standard", "deep"

  @IsBoolean()
  @Type(() => Boolean) // Auto-convert "true" string to boolean
  hasSupplies: boolean;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    // Nettoyage de chaque option dans le tableau ["ironing", "pets"]
    if (Array.isArray(value)) {
      return (value as unknown[]).map((v) =>
        typeof v === 'string' ? xss.filterXSS(v.trim()) : v,
      );
    }
    return value;
  })
  extras?: string[];

  // --- Schedule Info ---
  @IsDateString()
  @IsNotEmpty()
  // Pas besoin de filtre XSS ici, IsDateString rejette strictement tout ce qui n'est pas une date ISO valide
  startTime: string;

  @IsInt()
  @Min(1)
  @Type(() => Number) // Auto-convert "4" to 4
  durationHours: number;

  @IsString()
  @IsNotEmpty()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? xss.filterXSS(value.trim()) : value,
  )
  frequency: string; // e.g. "one-time", "weekly"

  // --- Admin / System Fields ---
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value === 'string') {
      return xss.filterXSS(value.trim().toUpperCase()); // Force majuscules
    }
    return value;
  })
  status?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  maidId?: number;

  // --- NOUVEAUX CHAMPS FINANCIERS ---
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  totalPrice?: number;

  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value === 'string') {
      return xss.filterXSS(value.trim().toUpperCase()); // Force majuscules (ex: " paid " -> "PAID")
    }
    return value;
  })
  paymentStatus?: string;
}
