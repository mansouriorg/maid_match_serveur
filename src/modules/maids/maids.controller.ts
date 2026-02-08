import { Controller, Get, Post, Body, Param, Delete, ParseIntPipe } from '@nestjs/common';
import { MaidsService } from './maids.service';
import { CreateMaidDto } from './dto/create-maid.dto';

@Controller('maids')
export class MaidsController {
  constructor(private readonly maidsService: MaidsService) {}

  // POST /maids
  // Add a new maid to your team
  @Post()
  create(@Body() createMaidDto: CreateMaidDto) {
    return this.maidsService.create(createMaidDto);
  }

  // GET /maids
  // See your entire team
  @Get()
  findAll() {
    return this.maidsService.findAll();
  }

  // GET /maids/:id
  // Get details of one specific maid
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.maidsService.findOne(id);
  }

  // DELETE /maids/:id
  // Remove a maid
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.maidsService.remove(id);
  }
}