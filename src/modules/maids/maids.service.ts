import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateMaidDto } from './dto/create-maid.dto';
import { UpdateMaidDto } from './dto/update-maid.dto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MaidsService {
  // We inject YOUR PrismaService here
  constructor(private readonly prisma: PrismaService) {}

  // 1. Add a new Maid
  async create(createMaidDto: CreateMaidDto) {
    return this.prisma.maid.create({
      data: {
        ...createMaidDto,
        status: 'AVAILABLE', // Default status
        rating: 5.0, // Default starting rating
        isVerified: false, // Default to unverified
      },
    });
  }

  // 2. Get Maids (With Smart Filters)
  // Allows you to search: "Find me a verified maid with 3+ years experience"
  async findAll(filters?: {
    specialty?: string;
    minExperience?: number;
    isVerified?: boolean;
  }) {
    const { specialty, minExperience, isVerified } = filters || {};

    return this.prisma.maid.findMany({
      where: {
        // Filter by Specialty (case insensitive)
        specialty: specialty
          ? { contains: specialty, mode: 'insensitive' }
          : undefined,
        // Filter by Minimum Experience
        experienceYears: minExperience ? { gte: +minExperience } : undefined,
        // Filter by Verification Status
        isVerified: isVerified !== undefined ? isVerified : undefined,
      },
      orderBy: {
        rating: 'desc', // Always show highest rated maids first
      },
    });
  }

  // 3. Find one maid (Include their work history)
  async findOne(id: number) {
    const maid = await this.prisma.maid.findUnique({
      where: { id },
      include: {
        requests: {
          take: 5, // Show their last 5 jobs
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!maid) throw new NotFoundException(`Maid #${id} not found`);
    return maid;
  }

  // 4. Update Maid Profile (Bio, Phone, etc.)
  async update(id: number, updateMaidDto: UpdateMaidDto) {
    // Check if exists
    await this.findOne(id);

    return this.prisma.maid.update({
      where: { id },
      data: updateMaidDto,
    });
  }

  // 5. Admin Action: Verify a Maid
  // Call this when you have checked their ID card
  async verifyMaid(id: number) {
    return this.prisma.maid.update({
      where: { id },
      data: { isVerified: true },
    });
  }

  // 6. Delete a maid
  async remove(id: number) {
    await this.findOne(id); // Ensure existence
    return this.prisma.maid.delete({
      where: { id },
    });
  }
}
