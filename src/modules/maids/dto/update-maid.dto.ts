import { PartialType } from '@nestjs/mapped-types';
import { CreateMaidDto } from './create-maid.dto';

export class UpdateMaidDto extends PartialType(CreateMaidDto) {}
