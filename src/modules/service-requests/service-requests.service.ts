// src/modules/service-requests/service-requests.service.ts
import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { CreateServiceRequestDto } from './dto/create-service-request.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { BadRequestException } from '@nestjs/common';
import type { ServiceRequest } from '../../../generated/prisma/client';
import { AuditService } from '../audit/audit.service'; // <-- IMPORT DE L'AUDIT

// What an admin may send to PATCH /service-requests/:id (the rest is ignored).
type UpdateInput = { totalPrice?: unknown; paymentStatus?: unknown };

@Injectable()
export class ServiceRequestsService {
  private readonly allowedStatuses = [
    'REQUESTED',
    'CONFIRMED',
    'ASSIGNED',
    'COMPLETED',
    'CANCELLED',
    'REJECTED',
  ];
  private readonly allowedPaymentStatuses = ['PENDING', 'PAID', 'REFUNDED'];

  // Keeps only the two fields an admin may change with PATCH /service-requests/:id
  // (price and payment status) and checks them. Anything else is ignored.
  private cleanUpdate(raw: UpdateInput | null | undefined): {
    totalPrice?: number;
    paymentStatus?: string;
  } {
    const data: { totalPrice?: number; paymentStatus?: string } = {};

    if (raw && raw.totalPrice !== undefined) {
      const price = Number(raw.totalPrice);
      if (Number.isFinite(price) === false || price < 0) {
        throw new BadRequestException('totalPrice must be a number, 0 or more');
      }
      data.totalPrice = price;
    }

    if (raw && raw.paymentStatus !== undefined) {
      const status = raw.paymentStatus;
      const text = typeof status === 'string' ? status : '';
      const value = text.trim().toUpperCase();
      if (this.allowedPaymentStatuses.includes(value) === false) {
        throw new BadRequestException(
          'paymentStatus must be one of: ' +
            this.allowedPaymentStatuses.join(', '),
        );
      }
      data.paymentStatus = value;
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException(
        'Nothing to update: send totalPrice and/or paymentStatus',
      );
    }
    return data;
  }
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly auditService: AuditService, // <-- INJECTION DE L'AUDIT
  ) {}

  private async calculatePrice(dto: CreateServiceRequestDto): Promise<number> {
    const settings = await this.prisma.settings.findUnique({
      where: { id: 1 },
    });
    let pricePerHour = settings?.defaultHourlyRate || 15;

    if (dto.cleaningType === 'deep') {
      pricePerHour += 5;
    }

    let total = dto.durationHours * pricePerHour;

    if (dto.hasSupplies === false) {
      total += 20;
    }

    if (dto.extras && dto.extras.length > 0) {
      total += dto.extras.length * 10;
    }

    return total;
  }

  // 1. Create a new request
  async create(rawDto: CreateServiceRequestDto, isAdmin = false) {
    // A visitor of the public site cannot choose the status, the maid, the
    // price or the payment status: the server decides. Only a logged-in admin can.
    const createDto: CreateServiceRequestDto = isAdmin
      ? rawDto
      : {
          ...rawDto,
          status: undefined,
          maidId: undefined,
          totalPrice: undefined,
          paymentStatus: undefined,
        };

    if (
      createDto.status !== undefined &&
      this.allowedStatuses.includes(createDto.status) === false
    ) {
      throw new BadRequestException(
        'status must be one of: ' + this.allowedStatuses.join(', '),
      );
    }
    if (
      createDto.paymentStatus !== undefined &&
      this.allowedPaymentStatuses.includes(createDto.paymentStatus) === false
    ) {
      throw new BadRequestException(
        'paymentStatus must be one of: ' +
          this.allowedPaymentStatuses.join(', '),
      );
    }
    let initialStatus = createDto.status || 'REQUESTED';

    if (createDto.maidId) {
      initialStatus = 'ASSIGNED';
    }

    const finalPrice =
      createDto.totalPrice || (await this.calculatePrice(createDto));
    const paymentStat = createDto.paymentStatus || 'PENDING';

    let newRequest: ServiceRequest;

    if (createDto.maidId) {
      newRequest = await this.prisma.$transaction(async (tx) => {
        const request = await tx.serviceRequest.create({
          data: {
            ...createDto,
            startTime: new Date(createDto.startTime),
            status: initialStatus,
            totalPrice: finalPrice,
            paymentStatus: paymentStat,
          },
        });

        await tx.maid.update({
          where: { id: createDto.maidId },
          data: { status: 'BUSY' },
        });

        return request;
      });
    } else {
      newRequest = await this.prisma.serviceRequest.create({
        data: {
          ...createDto,
          startTime: new Date(createDto.startTime),
          status: initialStatus,
          totalPrice: finalPrice,
          paymentStatus: paymentStat,
        },
      });
    }

    this.notificationsService.notifyAdminNewRequest(newRequest).catch((err) => {
      console.error("Erreur lors de l'envoi de la notification :", err);
    });

    return newRequest;
  }

  // 2. Get all requests
  async findAll(params?: {
    status?: string;
    search?: string;
    minDate?: string;
    maxDate?: string;
  }) {
    const { status, search, minDate, maxDate } = params || {};

    return this.prisma.serviceRequest.findMany({
      where: {
        ...(status && { status }),
        ...(minDate && maxDate
          ? {
              startTime: {
                gte: new Date(minDate),
                lte: new Date(maxDate),
              },
            }
          : {}),
        ...(search && {
          OR: [
            { customerName: { contains: search, mode: 'insensitive' } },
            { customerPhone: { contains: search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy:
        minDate && maxDate ? { startTime: 'asc' } : { createdAt: 'desc' },
      include: { maid: true },
    });
  }

  // 3. Get ONE request by ID
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

  // 4. Update Status (Workflow) + AUDIT
  async updateStatus(id: number, status: string, adminId?: number) {
    if (this.allowedStatuses.includes(status) === false) {
      throw new BadRequestException(
        'status must be one of: ' + this.allowedStatuses.join(', '),
      );
    }
    const request = await this.findOne(id);

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedRequest = await tx.serviceRequest.update({
        where: { id },
        data: { status },
        include: { maid: true },
      });

      if (
        ['COMPLETED', 'CANCELLED', 'REJECTED'].includes(status) &&
        request.maidId
      ) {
        await tx.maid.update({
          where: { id: request.maidId },
          data: { status: 'AVAILABLE' },
        });
      }

      return updatedRequest;
    });

    // 🛡️ LOG : Changement de statut du workflow
    await this.auditService.logAction(
      'UPDATE_STATUS',
      'ServiceRequest',
      id,
      `Statut du workflow passé de ${request.status} à ${status}.`,
      adminId,
    );

    return result;
  }

  // 5. Assign a Maid + AUDIT
  async assignMaid(requestId: number, maidId: number, adminId?: number) {
    await this.findOne(requestId);

    const maid = await this.prisma.maid.findUnique({ where: { id: maidId } });
    if (!maid) throw new NotFoundException(`Maid #${maidId} not found`);

    if (maid.status === 'BUSY') {
      throw new ConflictException(
        `Maid ${maid.fullName} is currently busy with another mission.`,
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.maid.update({
        where: { id: maidId },
        data: { status: 'BUSY' },
      });

      return tx.serviceRequest.update({
        where: { id: requestId },
        data: {
          maidId: maidId,
          status: 'ASSIGNED',
        },
        include: { maid: true },
      });
    });

    // 🛡️ LOG : Assignation d'intervenant
    await this.auditService.logAction(
      'ASSIGN_MAID',
      'ServiceRequest',
      requestId,
      `L'intervenant(e) ${maid.fullName} (ID: ${maidId}) a été assigné(e) à la mission.`,
      adminId,
    );

    return result;
  }

  // 6. Update General Fields (Payment, Price) + AUDIT
  async update(id: number, rawUpdate: any, adminId?: number) {
    const updateData = this.cleanUpdate(rawUpdate as UpdateInput);
    const oldRequest = await this.findOne(id);

    const updatedRequest = await this.prisma.serviceRequest.update({
      where: { id },
      data: updateData,
      include: { maid: true },
    });

    // 🛡️ LOG : Changement de prix
    if (
      updateData.totalPrice !== undefined &&
      updateData.totalPrice !== oldRequest.totalPrice
    ) {
      await this.auditService.logAction(
        'UPDATE_PRICE',
        'ServiceRequest',
        id,
        `Le prix est passé de ${oldRequest.totalPrice} \u20ac à ${updateData.totalPrice} \u20ac.`,
        adminId,
      );
    }

    // 🛡️ LOG : Changement de statut de paiement
    if (
      updateData.paymentStatus &&
      updateData.paymentStatus !== oldRequest.paymentStatus
    ) {
      await this.auditService.logAction(
        'UPDATE_PAYMENT',
        'ServiceRequest',
        id,
        `Le statut de paiement est passé de ${oldRequest.paymentStatus} à ${updateData.paymentStatus}.`,
        adminId,
      );
    }

    return updatedRequest;
  }

  // 7. Delete a request + AUDIT
  async remove(id: number, adminId?: number) {
    const request = await this.findOne(id);

    const result = await this.prisma.serviceRequest.delete({
      where: { id },
    });

    // 🛡️ LOG : Suppression définitive
    await this.auditService.logAction(
      'DELETE_REQUEST',
      'ServiceRequest',
      id,
      `La mission au nom de ${request.customerName} a été définitivement supprimée.`,
      adminId,
    );

    return result;
  }

  // 8. Analytics
  async getAnalytics() {
    const totalRequests = await this.prisma.serviceRequest.count();

    const statusCounts = await this.prisma.serviceRequest.groupBy({
      by: ['status'],
      _count: {
        status: true,
      },
    });

    const revenueResult = await this.prisma.serviceRequest.groupBy({
      by: ['paymentStatus'],
      _sum: {
        durationHours: true,
        totalPrice: true,
      },
      where: {
        status: {
          not: 'CANCELLED',
        },
      },
    });

    let estimatedRevenue = 0;
    let collectedRevenue = 0;
    let totalHours = 0;

    revenueResult.forEach((group) => {
      const sum = group._sum.totalPrice || 0;
      estimatedRevenue += sum;
      totalHours += group._sum.durationHours || 0;

      if (group.paymentStatus === 'PAID') {
        collectedRevenue += sum;
      }
    });

    const formattedStatusCounts = statusCounts.reduce(
      (acc, curr) => {
        acc[curr.status] = curr._count.status;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      totalRequests,
      statusCounts: {
        requested: formattedStatusCounts['REQUESTED'] || 0,
        assigned: formattedStatusCounts['ASSIGNED'] || 0,
        completed: formattedStatusCounts['COMPLETED'] || 0,
        cancelled: formattedStatusCounts['CANCELLED'] || 0,
      },
      totalHours,
      estimatedRevenue,
      collectedRevenue,
    };
  }
}
