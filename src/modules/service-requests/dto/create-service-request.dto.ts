import { IsString, IsNotEmpty, IsInt, IsOptional, IsDateString, Min } from 'class-validator';

export class CreateServiceRequestDto {
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsNotEmpty()
  serviceType: string;

  @IsDateString() // Validates YYYY-MM-DDTHH:mm:ss format
  @IsNotEmpty()
  startTime: string;

  @IsInt()
  @Min(1)
  duration: number;

  @IsString()
  @IsOptional()
  notes?: string;
}