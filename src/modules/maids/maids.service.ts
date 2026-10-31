import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
      // How many jobs each person has completed (shown as Missions)
      include: {
        _count: {
          select: { requests: { where: { status: 'COMPLETED' } } },
        },
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
        // How many jobs this person has completed (shown as Missions)
        _count: {
          select: { requests: { where: { status: 'COMPLETED' } } },
        },
      },
    });

    if (!maid) throw new NotFoundException(`Maid #${id} not found`);
    return maid;
  }

  // 3b. The profile shown in the admin: the person, how many jobs they have
  // completed, and their next assigned jobs (real data, nothing simulated).
  async findProfile(id: number) {
    const maid = await this.findOne(id);
    const upcoming = await this.prisma.serviceRequest.findMany({
      where: { maidId: id, status: 'ASSIGNED', startTime: { gte: new Date() } },
      orderBy: { startTime: 'asc' },
      take: 10,
      select: {
        id: true,
        startTime: true,
        durationHours: true,
        address: true,
        customerName: true,
      },
    });
    return { ...maid, upcoming };
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

  // 6. Delete a maid. Refused while they still have an assigned job, which
  // would otherwise stay ASSIGNED with nobody: reassign or cancel it first.
  async remove(id: number) {
    const maid = await this.findOne(id); // Ensure existence
    const active = await this.prisma.serviceRequest.count({
      where: { maidId: id, status: 'ASSIGNED' },
    });
    if (active > 0) {
      throw new ConflictException(
        `${maid.fullName} a encore ${active} intervention(s) assign\u00e9e(s) : ` +
          `r\u00e9assignez-les ou annulez-les d'abord.`,
      );
    }
    return this.prisma.maid.delete({
      where: { id },
    });
  }
}
