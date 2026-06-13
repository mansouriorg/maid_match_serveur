import { PartialType } from '@nestjs/mapped-types';
import { CreateMaidDto } from './create-maid.dto';
import { IsBoolean, IsNumber, IsOptional, Max, Min, IsString } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import * as xss from 'xss';

export class UpdateMaidDto extends PartialType(CreateMaidDto) {
  // Add fields that are NOT in CreateMaidDto but editable by Admin
  
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean) // Sécurité : convertit le texte "true" en vrai booléen
  isVerified?: boolean;

  @IsOptional()
  @IsNumber()
  @Type(() => Number) // Sécurité : convertit le texte "4.5" en nombre 4.5
  @Min(0)
  @Max(5)
  rating?: number;

  @IsOptional()
  @IsString()
  // 🛡️ SANITIZATION : Nettoie le statut, enlève les espaces, et force en majuscules (ex: " busy " -> "BUSY")
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      const cleaned = xss.filterXSS(value.trim().toUpperCase());
      return cleaned;
    }
    return value;
  })
  status?: string; // e.g. "AVAILABLE", "BUSY", "ON_LEAVE"
}