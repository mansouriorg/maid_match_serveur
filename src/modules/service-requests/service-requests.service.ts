import { 
  Injectable, 
  NotFoundException, 
  BadRequestException, 
  ConflictException 
} from '@nestjs/common';
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
        startTime: new Date(createDto.startTime),
        status: 'REQUESTED',
      },
    });
  }

  // 2. Get all requests (Supports Search by Name/Phone & Status Filter)
  async findAll(params?: { status?: string; search?: string }) {
    const { status, search } = params || {};

    return this.prisma.serviceRequest.findMany({
      where: {
        // Filter by Status (if provided)
        ...(status && { status }),
        
        // Search by Name OR Phone (if provided)
        ...(search && {
          OR: [
            { customerName: { contains: search, mode: 'insensitive' } },
            { customerPhone: { contains: search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: { createdAt: 'desc' }, // Newest first
      include: { maid: true },
    });
  }

  // 3. Get ONE request by ID (Used for Detail View)
  async findOne(id: number) {
    const request = await this.prisma.serviceRequest.findUnique({
      where: { id },
      include: { maid: true },
    });

    if (!request) {
      throw new NotFoundException(`Service Request with ID ${id} not found`);
    }

    return request;
  }

  // 4. Update Status (With Smart Logic)
  // Logic: If job is 'COMPLETED' or 'CANCELLED', free up the maid automatically.
  async updateStatus(id: number, status: string) {
    const request = await this.findOne(id);

    // Transaction: Update request AND Update Maid status together
    return this.prisma.$transaction(async (tx) => {
      
      // A. Update the Request Status
      const updatedRequest = await tx.serviceRequest.update({
        where: { id },
        data: { status },
        include: { maid: true }
      });

      // B. If the job is finished/cancelled, set the maid back to AVAILABLE
      // We check if a maid was actually assigned before trying to free them
      if (['COMPLETED', 'CANCELLED', 'REJECTED'].includes(status) && request.maidId) {
        await tx.maid.update({
          where: { id: request.maidId },
          data: { status: 'AVAILABLE' },
        });
      }

      return updatedRequest;
    });
  }

  // 5. Assign a Maid to a Request (With Validation & Transaction)
  async assignMaid(requestId: number, maidId: number) {
    // A. Check if Request exists
    await this.findOne(requestId);

    // B. Check if Maid exists
    const maid = await this.prisma.maid.findUnique({ where: { id: maidId } });
    if (!maid) throw new NotFoundException(`Maid #${maidId} not found`);

    // C. Check if Maid is already busy (Optional but recommended safety check)
    if (maid.status === 'BUSY') {
       throw new ConflictException(`Maid ${maid.fullName} is currently busy with another mission.`);
    }

    // D. Perform updates in a Transaction (All or Nothing)
    return this.prisma.$transaction(async (tx) => {
      // 1. Mark Maid as BUSY
      await tx.maid.update({
        where: { id: maidId },
        data: { status: 'BUSY' },
      });

      // 2. Link Maid to Request and update status to ASSIGNED
      return tx.serviceRequest.update({
        where: { id: requestId },
        data: {
          maidId: maidId,
          status: 'ASSIGNED',
        },
        include: { maid: true },
      });
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