import { IsString, IsNotEmpty, IsOptional, IsInt, Min, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateMaidDto {
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @IsString()
  @IsNotEmpty()
  specialty: string; // e.g. "Deep Cleaning", "Elderly Care"

  @IsString()
  @IsOptional()
  address?: string;

  // --- NEW FIELDS MATCHING YOUR FRONTEND FORM ---

  @IsOptional()
  @Type(() => Number) // <--- CRITICAL: Converts "5" (string) to 5 (number)
  @IsInt()
  @Min(0)
  experienceYears?: number;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true }) // Ensures every item in the array is a string
  languages?: string[];
}