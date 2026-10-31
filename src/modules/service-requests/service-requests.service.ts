// src/modules/service-requests/service-requests.service.ts
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateServiceRequestDto } from './dto/create-service-request.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import type { ServiceRequest } from '../../../generated/prisma/client';
import { AuditService } from '../audit/audit.service';
import { addDaysInParis } from '../../common/paris-time';

// What an admin may send to PATCH /service-requests/:id (the rest is ignored).
type UpdateInput = {
  totalPrice?: unknown;
  paymentStatus?: unknown;
  internalNote?: unknown;
};

const HOUR_MS = 3600000;

// How many days separate two jobs of a recurring booking.
const REPEAT_DAYS: Record<string, number> = { weekly: 7, 'bi-weekly': 14 };

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

  // Which status may follow which on PATCH /service-requests/:id/status.
  // ASSIGNED is only set by the assignment route. A completed, cancelled or
  // rejected booking stays as it is.
  private readonly nextStatuses: Record<string, string[]> = {
    REQUESTED: ['CONFIRMED', 'REJECTED', 'CANCELLED'],
    CONFIRMED: ['CANCELLED'],
    ASSIGNED: ['COMPLETED', 'CANCELLED'],
    COMPLETED: [],
    CANCELLED: [],
    REJECTED: [],
  };

  // A booking can receive a staff member once it is confirmed, and an
  // assigned booking can be given to someone else.
  private readonly assignableStatuses = ['CONFIRMED', 'ASSIGNED'];

  // Keeps only the fields an admin may change with PATCH /service-requests/:id
  // (price, payment status, internal note) and checks them. The rest is ignored.
  private cleanUpdate(raw: UpdateInput | null | undefined): {
    totalPrice?: number;
    paymentStatus?: string;
    internalNote?: string | null;
  } {
    const data: {
      totalPrice?: number;
      paymentStatus?: string;
      internalNote?: string | null;
    } = {};

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

    if (raw && raw.internalNote !== undefined) {
      const note = raw.internalNote;
      if (note !== null && typeof note !== 'string') {
        throw new BadRequestException('internalNote must be text');
      }
      const text = (note ?? '').trim();
      if (text.length > 2000) {
        throw new BadRequestException(
          'La note interne ne peut pas d\u00e9passer 2000 caract\u00e8res.',
        );
      }
      // An empty note removes it.
      data.internalNote = text === '' ? null : text;
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException(
        'Nothing to update: send totalPrice, paymentStatus and/or internalNote',
      );
    }
    return data;
  }

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly auditService: AuditService,
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

  // The last day of the period the customer said they are available, kept
  // only if it comes after the first day.
  private endDateFrom(dto: { startTime: string; endDate?: string }) {
    if (dto.endDate === undefined) {
      return undefined;
    }
    const end = new Date(dto.endDate);
    return end > new Date(dto.startTime) ? end : undefined;
  }

  // When a job ends: its start plus its duration.
  private endOf(start: Date, durationHours: number): Date {
    return new Date(start.getTime() + durationHours * HOUR_MS);
  }

  // A staff member is busy only during their assigned jobs, not in between.
  // Refuses someone on leave, or someone with an assigned job that overlaps
  // this time (the booking being changed is left out of the check).
  private async checkMaidIsFree(
    maidId: number,
    start: Date,
    durationHours: number,
    ignoreRequestId?: number,
  ) {
    const maid = await this.prisma.maid.findUnique({ where: { id: maidId } });
    if (maid === null) {
      throw new NotFoundException(`Maid #${maidId} not found`);
    }
    if (maid.status === 'ON_LEAVE') {
      throw new ConflictException(`${maid.fullName} est en cong\u00e9.`);
    }

    const end = this.endOf(start, durationHours);
    // Jobs last less than a day, so only jobs starting in the 24 hours before
    // this one ends can overlap it.
    const nearby = await this.prisma.serviceRequest.findMany({
      where: {
        maidId,
        status: 'ASSIGNED',
        id:
          ignoreRequestId === undefined ? undefined : { not: ignoreRequestId },
        startTime: { lt: end, gt: new Date(start.getTime() - 24 * HOUR_MS) },
      },
    });
    const clash = nearby.find(
      (other) => this.endOf(other.startTime, other.durationHours) > start,
    );
    if (clash) {
      throw new ConflictException(
        `${maid.fullName} a d\u00e9j\u00e0 une intervention \u00e0 ce moment (demande #${clash.id}).`,
      );
    }
    return maid;
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

    const startTime = new Date(createDto.startTime);
    // An admin may book a staff member directly: that person must be free.
    if (createDto.maidId) {
      initialStatus = 'ASSIGNED';
      await this.checkMaidIsFree(
        createDto.maidId,
        startTime,
        createDto.durationHours,
      );
    }

    const finalPrice =
      createDto.totalPrice || (await this.calculatePrice(createDto));
    const paymentStat = createDto.paymentStatus || 'PENDING';

    const newRequest: ServiceRequest = await this.prisma.serviceRequest.create({
      data: {
        ...createDto,
        startTime,
        endDate: this.endDateFrom(createDto),
        status: initialStatus,
        totalPrice: finalPrice,
        paymentStatus: paymentStat,
      },
    });

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

    if (request === null) {
      throw new NotFoundException(`Service Request with ID ${id} not found`);
    }

    return request;
  }

  // 4. Update the status (workflow), in the allowed order only, + audit
  async updateStatus(id: number, status: string, adminId?: number) {
    if (this.allowedStatuses.includes(status) === false) {
      throw new BadRequestException(
        'status must be one of: ' + this.allowedStatuses.join(', '),
      );
    }
    const request = await this.findOne(id);

    const allowedNext = this.nextStatuses[request.status] ?? [];
    if (allowedNext.includes(status) === false) {
      throw new BadRequestException(
        `Impossible de passer de ${request.status} \u00e0 ${status}.`,
      );
    }

    const result = await this.prisma.serviceRequest.update({
      where: { id },
      data: { status },
      include: { maid: true },
    });

    // Audit log: workflow status change
    await this.auditService.logAction(
      'UPDATE_STATUS',
      'ServiceRequest',
      id,
      `Statut du workflow pass\u00e9 de ${request.status} \u00e0 ${status}.`,
      adminId,
    );

    // A recurring booking that is completed gets its next job: same Paris
    // time, 7 or 14 days later, with the same person if they are free then.
    const repeatDays = REPEAT_DAYS[request.frequency];
    if (status === 'COMPLETED' && repeatDays !== undefined) {
      const next = await this.createNextOccurrence(
        request,
        repeatDays,
        adminId,
      );
      return { ...result, nextRequestId: next.id };
    }

    return result;
  }

  // Creates the next job of a recurring booking (see updateStatus). It keeps
  // the customer, the place, the options, the price and the internal note.
  private async createNextOccurrence(
    request: ServiceRequest,
    repeatDays: number,
    adminId?: number,
  ) {
    const startTime = addDaysInParis(request.startTime, repeatDays);
    let maidId: number | undefined;
    if (request.maidId !== null) {
      try {
        await this.checkMaidIsFree(
          request.maidId,
          startTime,
          request.durationHours,
        );
        maidId = request.maidId;
      } catch {
        // Busy or on leave then: the next job waits for someone.
        maidId = undefined;
      }
    }
    const next = await this.prisma.serviceRequest.create({
      data: {
        customerName: request.customerName,
        customerEmail: request.customerEmail,
        customerPhone: request.customerPhone,
        address: request.address,
        propertyType: request.propertyType,
        rooms: request.rooms,
        bathrooms: request.bathrooms,
        cleaningType: request.cleaningType,
        hasSupplies: request.hasSupplies,
        extras: request.extras,
        startTime,
        durationHours: request.durationHours,
        frequency: request.frequency,
        totalPrice: request.totalPrice,
        paymentStatus: 'PENDING',
        internalNote: request.internalNote,
        status: maidId === undefined ? 'CONFIRMED' : 'ASSIGNED',
        maidId,
      },
    });
    await this.auditService.logAction(
      'CREATE_NEXT_OCCURRENCE',
      'ServiceRequest',
      next.id,
      `Intervention suivante cr\u00e9\u00e9e automatiquement apr\u00e8s la demande #${request.id}.`,
      adminId,
    );
    return next;
  }

  // 5. Assign (or change) the staff member + audit
  async assignMaid(requestId: number, maidId: number, adminId?: number) {
    const request = await this.findOne(requestId);

    if (this.assignableStatuses.includes(request.status) === false) {
      throw new BadRequestException(
        `Une demande ${request.status} ne peut pas recevoir d'intervenant.`,
      );
    }

    const maid = await this.checkMaidIsFree(
      maidId,
      request.startTime,
      request.durationHours,
      requestId,
    );

    const result = await this.prisma.serviceRequest.update({
      where: { id: requestId },
      data: {
        maidId: maidId,
        status: 'ASSIGNED',
      },
      include: { maid: true },
    });

    // Audit log: staff assignment (and who had the job before, if anyone)
    const before = request.maid ? ` (avant : ${request.maid.fullName})` : '';
    await this.auditService.logAction(
      'ASSIGN_MAID',
      'ServiceRequest',
      requestId,
      `L'intervenant(e) ${maid.fullName} (ID: ${maidId}) a \u00e9t\u00e9 assign\u00e9(e) \u00e0 la mission${before}.`,
      adminId,
    );

    return result;
  }

  // 6. Update General Fields (Payment, Price) + audit
  async update(id: number, rawUpdate: any, adminId?: number) {
    const updateData = this.cleanUpdate(rawUpdate as UpdateInput);
    const oldRequest = await this.findOne(id);

    const updatedRequest = await this.prisma.serviceRequest.update({
      where: { id },
      data: updateData,
      include: { maid: true },
    });

    // Audit log: price change
    if (
      updateData.totalPrice !== undefined &&
      updateData.totalPrice !== oldRequest.totalPrice
    ) {
      await this.auditService.logAction(
        'UPDATE_PRICE',
        'ServiceRequest',
        id,
        `Le prix est pass\u00e9 de ${oldRequest.totalPrice} \u20ac \u00e0 ${updateData.totalPrice} \u20ac.`,
        adminId,
      );
    }

    // Audit log: payment status change
    if (
      updateData.paymentStatus &&
      updateData.paymentStatus !== oldRequest.paymentStatus
    ) {
      await this.auditService.logAction(
        'UPDATE_PAYMENT',
        'ServiceRequest',
        id,
        `Le statut de paiement est pass\u00e9 de ${oldRequest.paymentStatus} \u00e0 ${updateData.paymentStatus}.`,
        adminId,
      );
    }

    // Audit log: internal note changed (the text itself is not copied there)
    if (
      updateData.internalNote !== undefined &&
      updateData.internalNote !== oldRequest.internalNote
    ) {
      await this.auditService.logAction(
        'UPDATE_NOTE',
        'ServiceRequest',
        id,
        'La note interne a \u00e9t\u00e9 modifi\u00e9e.',
        adminId,
      );
    }

    return updatedRequest;
  }

  // 7. Delete a request + audit
  async remove(id: number, adminId?: number) {
    const request = await this.findOne(id);

    const result = await this.prisma.serviceRequest.delete({
      where: { id },
    });

    // Audit log: permanent deletion
    await this.auditService.logAction(
      'DELETE_REQUEST',
      'ServiceRequest',
      id,
      `La mission au nom de ${request.customerName} a \u00e9t\u00e9 d\u00e9finitivement supprim\u00e9e.`,
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
      // Cancelled and rejected requests bring no revenue.
      where: {
        status: {
          notIn: ['CANCELLED', 'REJECTED'],
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
        confirmed: formattedStatusCounts['CONFIRMED'] || 0,
        assigned: formattedStatusCounts['ASSIGNED'] || 0,
        completed: formattedStatusCounts['COMPLETED'] || 0,
        cancelled: formattedStatusCounts['CANCELLED'] || 0,
        rejected: formattedStatusCounts['REJECTED'] || 0,
      },
      totalHours,
      estimatedRevenue,
      collectedRevenue,
    };
  }
}
