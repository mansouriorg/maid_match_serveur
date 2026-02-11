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

export class CreateServiceRequestDto {
  // --- Customer Info (from StepContact) ---
  @IsString()
  @IsNotEmpty()
  customerName: string;

  @IsEmail()
  @IsNotEmpty()
  customerEmail: string;

  @IsString()
  @IsNotEmpty()
  customerPhone: string;

  // --- Property Info (from StepProperty) ---
  @IsString()
  @IsNotEmpty()
  address: string;

  @IsString()
  @IsNotEmpty()
  propertyType: string; // e.g. "apartment", "villa"

  @IsInt()
  @Min(1)
  rooms: number;

  @IsInt()
  @Min(1)
  bathrooms: number;

  @IsString()
  @IsNotEmpty()
  cleaningType: string; // e.g. "standard", "deep"

  @IsBoolean()
  hasSupplies: boolean;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  extras?: string[]; // e.g. ["ironing", "pets"]

  // --- Schedule Info (from StepSchedule) ---
  @IsDateString() 
  @IsNotEmpty()
  startTime: string; // ISO String sent from frontend

  @IsInt()
  @Min(1)
  durationHours: number;

  @IsString()
  @IsNotEmpty()
  frequency: string; // e.g. "one-time", "weekly"

  // --- System Fields ---
  @IsString()
  @IsOptional()
  status?: string; // Defaults to "REQUESTED" in Schema if empty
}