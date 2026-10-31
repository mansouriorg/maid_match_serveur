import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { MaidsService } from './maids.service';
import { CreateMaidDto } from './dto/create-maid.dto';
import { UpdateMaidDto } from './dto/update-maid.dto';

@Controller('maids')
export class MaidsController {
  constructor(private readonly maidsService: MaidsService) {}

  // 1. POST /maids
  // Add a new maid to your team
  @Post()
  create(@Body() createMaidDto: CreateMaidDto) {
    return this.maidsService.create(createMaidDto);
  }

  // 2. GET /maids?specialty=Cleaning&minExperience=2&isVerified=true
  // See your team (with optional filters)
  @Get()
  findAll(
    @Query('specialty') specialty?: string,
    @Query('minExperience') minExperience?: string, // Query params come as strings
    @Query('isVerified') isVerified?: string,
  ) {
    // Convert query strings to correct types for the Service
    const experience = minExperience ? parseInt(minExperience) : undefined;
    const verified =
      isVerified === 'true' ? true : isVerified === 'false' ? false : undefined;

    return this.maidsService.findAll({
      specialty,
      minExperience: experience,
      isVerified: verified,
    });
  }

  // 3. GET /maids/:id
  // Get details of one specific maid (includes their work history)
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.maidsService.findOne(id);
  }

  // 4. PATCH /maids/:id
  // Update general details (Bio, Phone, Experience)
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateMaidDto: UpdateMaidDto,
  ) {
    return this.maidsService.update(id, updateMaidDto);
  }

  // 5. PATCH /maids/:id/verify
  // Quick action: Mark a maid as Verified (ID Checked)
  @Patch(':id/verify')
  verifyMaid(@Param('id', ParseIntPipe) id: number) {
    return this.maidsService.verifyMaid(id);
  }

  // 6. DELETE /maids/:id
  // Remove a maid
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.maidsService.remove(id);
  }
}
