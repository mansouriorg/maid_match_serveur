import { Injectable } from '@nestjs/common';
import { CreateMaidDto } from './dto/create-maid.dto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MaidsService {
  constructor(private readonly prisma: PrismaService) {}

  // 1. Add a new Maid to the database
  async create(createMaidDto: CreateMaidDto) {
    return this.prisma.maid.create({
      data: createMaidDto,
    });
  }

  // 2. Get list of all Maids
  async findAll() {
    return this.prisma.maid.findMany();
  }

  // 3. Find one maid by ID
  async findOne(id: number) {
    return this.prisma.maid.findUnique({
      where: { id },
    });
  }

  // 4. Delete a maid (if they stop working for you)
  async remove(id: number) {
    return this.prisma.maid.delete({
      where: { id },
    });
  }
}