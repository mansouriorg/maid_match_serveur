import { Injectable } from '@nestjs/common';
import { CreateServiceRequestDto } from './dto/create-service-request.dto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ServiceRequestsService {
  constructor(private readonly prisma: PrismaService) {}

  // 1. Create a new request (Used by Frontend)
  async create(createDto: CreateServiceRequestDto) {
    return this.prisma.serviceRequest.create({
      data: {
        ...createDto,
        startTime: new Date(createDto.startTime), // Ensure date conversion
      },
    });
  }

  // 2. Get all requests (Used by Admin Dashboard)
  async findAll() {
    return this.prisma.serviceRequest.findMany({
      orderBy: {
        createdAt: 'desc', // Show newest requests first
      },
    });
  }

  // 3. Update status (Used by Admin to mark as 'Contacted')
  async updateStatus(id: number, status: string) {
    return this.prisma.serviceRequest.update({
      where: { id },
      data: { status },
    });
  }
}