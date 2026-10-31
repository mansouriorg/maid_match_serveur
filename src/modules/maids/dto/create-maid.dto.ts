import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  Min,
  IsArray,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import * as xss from 'xss'; // <-- Import de la bibliothèque de sécurité

export class CreateMaidDto {
  @IsString()
  @IsNotEmpty()
  // Nettoyage des espaces inutiles et neutralisation des balises HTML/Scripts
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? xss.filterXSS(value.trim()) : value,
  )
  fullName: string;

  @IsString()
  @IsNotEmpty()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? xss.filterXSS(value.trim()) : value,
  )
  phoneNumber: string;

  @IsString()
  @IsNotEmpty()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? xss.filterXSS(value.trim()) : value,
  )
  specialty: string; // e.g. "Deep Cleaning", "Elderly Care"

  @IsString()
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? xss.filterXSS(value.trim()) : value,
  )
  address?: string;

  // --- NEW FIELDS MATCHING YOUR FRONTEND FORM ---

  @IsOptional()
  @Type(() => Number) // <--- CRITICAL: Converts "5" (string) to 5 (number)
  @IsInt()
  @Min(0)
  experienceYears?: number;

  @IsOptional()
  @IsString()
  // 🔥 Le champ le plus à risque (Texte libre) : Protection XSS maximale
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? xss.filterXSS(value.trim()) : value,
  )
  bio?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true }) // Ensures every item in the array is a string
  // Nettoyage pour chaque élément du tableau
  @Transform(({ value }: { value: unknown }) => {
    if (Array.isArray(value)) {
      return (value as unknown[]).map((v) =>
        typeof v === 'string' ? xss.filterXSS(v.trim()) : v,
      );
    }
    return value;
  })
  languages?: string[];
}
