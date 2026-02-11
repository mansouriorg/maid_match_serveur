import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateServiceRequestDto } from './dto/create-service-request.dto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ServiceRequestsService {
  constructor(private readonly prisma: PrismaService) {}

  // 1. Create a new request (Used by Frontend Wizard)
  async create(createDto: CreateServiceRequestDto) {
    return this.prisma.serviceRequest.create({
      data: {
        ...createDto,
        // Ensure the string from DTO is converted to a Date object for the DB
        startTime: new Date(createDto.startTime), 
        // Default status is set to "REQUESTED" by Schema, so we don't need to set it manually unless overridden
      },
    });
  }

  // 2. Get all requests (Used by Admin Dashboard)
  // UPDATED: Added optional 'status' filter
  async findAll(status?: string) {
    return this.prisma.serviceRequest.findMany({
      where: status ? { status } : {}, // If status is provided, filter by it
      orderBy: {
        createdAt: 'desc', // Show newest requests first
      },
      include: {
        maid: true, // Also fetch the assigned Maid details if one exists
      },
    });
  }

  // 3. Get ONE request by ID (Used for Detail View)
  // NEW: Needed for clicking on a request in the dashboard
  async findOne(id: number) {
    const request = await this.prisma.serviceRequest.findUnique({
      where: { id },
      include: {
        maid: true, // See which maid is assigned
      },
    });

    if (!request) {
      throw new NotFoundException(`Service Request with ID ${id} not found`);
    }

    return request;
  }

  // 4. Update status (Used by Admin to mark as 'CONFIRMED' or 'COMPLETED')
  async updateStatus(id: number, status: string) {
    // Check if exists first
    await this.findOne(id); 

    return this.prisma.serviceRequest.update({
      where: { id },
      data: { status },
    });
  }

  // 5. Assign a Maid to a Request (NEW)
  // Connects the Maid table to the ServiceRequest table
  async assignMaid(requestId: number, maidId: number) {
    await this.findOne(requestId);

    return this.prisma.serviceRequest.update({
      where: { id: requestId },
      data: {
        maidId: maidId,
        status: 'ASSIGNED', // Automatically update status
      },
      include: {
        maid: true, // Return the updated object with maid info
      },
    });
  }

  // 6. Delete a request (Used for cleanup/spam)
  async remove(id: number) {
    await this.findOne(id); // Ensure it exists before trying to delete

    return this.prisma.serviceRequest.delete({
      where: { id },
    });
  }
}