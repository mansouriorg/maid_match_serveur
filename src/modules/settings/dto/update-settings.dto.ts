import { IsString, IsOptional, IsBoolean, IsEmail } from 'class-validator';

export class UpdateSettingsDto {
  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  companyName?: string;

  @IsString()
  @IsOptional()
  contactPhone?: string;

  // On accepte les deux car depuis le front, un input type="number" renvoie souvent une string
  @IsOptional()
  defaultHourlyRate?: number | string;

  @IsBoolean()
  @IsOptional()
  emailAlerts?: boolean;

  @IsBoolean()
  @IsOptional()
  smsAlerts?: boolean;
}