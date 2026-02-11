import { PartialType } from '@nestjs/mapped-types';
import { CreateMaidDto } from './create-maid.dto';
import { IsBoolean, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class UpdateMaidDto extends PartialType(CreateMaidDto) {
  // Add fields that are NOT in CreateMaidDto but editable by Admin
  @IsBoolean()
  @IsOptional()
  isVerified?: boolean;

  @IsNumber()
  @Min(0)
  @Max(5)
  @IsOptional()
  rating?: number;

  @IsOptional()
  status?: string;
}