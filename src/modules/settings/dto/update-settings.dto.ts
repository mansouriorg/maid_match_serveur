import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEmail,
  IsNumber,
  Min,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import * as xss from 'xss';

export class UpdateSettingsDto {
  @IsString()
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? xss.filterXSS(value.trim()) : value,
  )
  firstName?: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? xss.filterXSS(value.trim()) : value,
  )
  lastName?: string;

  @IsEmail()
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value === 'string') {
      return xss.filterXSS(value.trim().toLowerCase()); // Nettoyage + minuscules
    }
    return value;
  })
  email?: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? xss.filterXSS(value.trim()) : value,
  )
  companyName?: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? xss.filterXSS(value.trim()) : value,
  )
  contactPhone?: string;

  // 🛡️ SÉCURITÉ : Plus besoin d'accepter "number | string".
  // @Type() va automatiquement et proprement convertir "15" en 15.
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  defaultHourlyRate?: number;

  // 🛡️ SÉCURITÉ : Idem pour les booléens envoyés depuis des formulaires
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  emailAlerts?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  smsAlerts?: boolean;
}
