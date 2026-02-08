import { IsString, IsNotEmpty, IsPhoneNumber, IsOptional } from 'class-validator';

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
}