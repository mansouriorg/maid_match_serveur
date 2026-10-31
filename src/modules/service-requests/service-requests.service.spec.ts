import { BadRequestException, ConflictException } from '@nestjs/common';
import { ServiceRequestsService } from './service-requests.service';

// The real services need the database. Small fakes are enough here.
jest.mock('../../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));
jest.mock('../notifications/notifications.service', () => ({
  NotificationsService: class NotificationsService {},
}));
jest.mock('../audit/audit.service', () => ({
  AuditService: class AuditService {},
}));

const visitorDto: any = {
  customerName: 'Ada',
  customerEmail: 'ada@example.com',
  customerPhone: '0612345678',
  address: '1 rue Example',
  propertyType: 'apartment',
  rooms: 2,
  bathrooms: 1,
  cleaningType: 'standard',
  hasSupplies: true,
  extras: [],
  startTime: '2026-12-01T09:00:00.000Z',
  durationHours: 3,
  frequency: 'one-time',
  // A visitor tries to choose these. The server must ignore them.
  status: 'COMPLETED',
  maidId: 5,
  totalPrice: 1,
  paymentStatus: 'PAID',
};

describe('ServiceRequestsService', () => {
  let service: ServiceRequestsService;

  const prismaFake: any = {
    settings: { findUnique: jest.fn() },
    serviceRequest: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    maid: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  };
  const notificationsFake = {
    notifyAdminNewRequest: jest.fn(),
  };
  const auditFake = { logAction: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    prismaFake.settings.findUnique.mockResolvedValue({ defaultHourlyRate: 20 });
    prismaFake.serviceRequest.create.mockResolvedValue({ id: 1 });
    prismaFake.serviceRequest.findUnique.mockResolvedValue({
      id: 1,
      status: 'REQUESTED',
      totalPrice: 40,
      paymentStatus: 'PENDING',
    });
    prismaFake.serviceRequest.update.mockResolvedValue({ id: 1 });
    prismaFake.serviceRequest.findMany.mockResolvedValue([]);
    prismaFake.maid.findUnique.mockResolvedValue({
      id: 5,
      fullName: 'Lina',
      status: 'AVAILABLE',
    });
    notificationsFake.notifyAdminNewRequest.mockResolvedValue(undefined);
    service = new ServiceRequestsService(
      prismaFake,
      notificationsFake as any,
      auditFake as any,
    );
  });

  it('ignores status, maid, price and payment sent by a visitor', async () => {
    await service.create(visitorDto);

    expect(prismaFake.$transaction).not.toHaveBeenCalled();
    const data = prismaFake.serviceRequest.create.mock.calls[0][0].data;
    expect(data.status).toBe('REQUESTED');
    expect(data.paymentStatus).toBe('PENDING');
    expect(data.totalPrice).toBe(60);
    expect(data.maidId).toBeUndefined();
  });

  it('keeps the last day the customer is available', async () => {
    const endDate = '2026-12-04T09:00:00.000Z';
    await service.create({ ...visitorDto, endDate });

    const data = prismaFake.serviceRequest.create.mock.calls[0][0].data;
    expect(data.endDate).toEqual(new Date(endDate));
  });

  it('ignores an end date that is not after the first day', async () => {
    const endDate = '2026-11-30T09:00:00.000Z';
    await service.create({ ...visitorDto, endDate });

    const data = prismaFake.serviceRequest.create.mock.calls[0][0].data;
    expect(data.endDate).toBeUndefined();
  });

  describe('status order and staff availability', () => {
    const booking = (status: string) => ({
      id: 1,
      status,
      startTime: new Date('2026-12-01T09:00:00.000Z'),
      durationHours: 3,
      maidId: null,
      maid: null,
      customerName: 'Ada',
    });
    const otherJob = (startIso: string, durationHours: number) => ({
      id: 9,
      startTime: new Date(startIso),
      durationHours,
    });

    it('lets a new request be confirmed', async () => {
      prismaFake.serviceRequest.findUnique.mockResolvedValue(
        booking('REQUESTED'),
      );
      await service.updateStatus(1, 'CONFIRMED');
      expect(prismaFake.serviceRequest.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: 'CONFIRMED' },
        include: { maid: true },
      });
    });

    it('refuses to skip steps or to reopen a closed booking', async () => {
      prismaFake.serviceRequest.findUnique.mockResolvedValue(
        booking('REQUESTED'),
      );
      await expect(service.updateStatus(1, 'COMPLETED')).rejects.toThrow(
        BadRequestException,
      );
      prismaFake.serviceRequest.findUnique.mockResolvedValue(
        booking('CANCELLED'),
      );
      await expect(service.updateStatus(1, 'CONFIRMED')).rejects.toThrow(
        BadRequestException,
      );
      expect(prismaFake.serviceRequest.update).not.toHaveBeenCalled();
    });

    it('assigns a free person without a global busy flag', async () => {
      prismaFake.serviceRequest.findUnique.mockResolvedValue(
        booking('CONFIRMED'),
      );
      await service.assignMaid(1, 5);
      expect(prismaFake.serviceRequest.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { maidId: 5, status: 'ASSIGNED' },
        include: { maid: true },
      });
    });

    it('refuses a staff member who already works at that time', async () => {
      prismaFake.serviceRequest.findUnique.mockResolvedValue(
        booking('CONFIRMED'),
      );
      prismaFake.serviceRequest.findMany.mockResolvedValue([
        otherJob('2026-12-01T10:00:00.000Z', 2),
      ]);
      await expect(service.assignMaid(1, 5)).rejects.toThrow(ConflictException);
      expect(prismaFake.serviceRequest.update).not.toHaveBeenCalled();
    });

    it('accepts the same staff member on another day', async () => {
      prismaFake.serviceRequest.findUnique.mockResolvedValue(
        booking('CONFIRMED'),
      );
      prismaFake.serviceRequest.findMany.mockResolvedValue([
        otherJob('2026-11-30T12:00:00.000Z', 3),
      ]);
      await service.assignMaid(1, 5);
      expect(prismaFake.serviceRequest.update).toHaveBeenCalled();
    });

    it('refuses a staff member on leave, and a finished booking', async () => {
      prismaFake.serviceRequest.findUnique.mockResolvedValue(
        booking('CONFIRMED'),
      );
      prismaFake.maid.findUnique.mockResolvedValue({
        id: 5,
        fullName: 'Lina',
        status: 'ON_LEAVE',
      });
      await expect(service.assignMaid(1, 5)).rejects.toThrow(ConflictException);
      prismaFake.serviceRequest.findUnique.mockResolvedValue(
        booking('COMPLETED'),
      );
      await expect(service.assignMaid(1, 5)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('dashboard figures', () => {
    it('leaves cancelled and rejected requests out of the revenue', async () => {
      prismaFake.serviceRequest.count.mockResolvedValue(5);
      prismaFake.serviceRequest.groupBy
        .mockResolvedValueOnce([
          { status: 'REQUESTED', _count: { status: 2 } },
          { status: 'CONFIRMED', _count: { status: 1 } },
          { status: 'REJECTED', _count: { status: 1 } },
          { status: 'CANCELLED', _count: { status: 1 } },
        ])
        .mockResolvedValueOnce([]);

      const result = await service.getAnalytics();

      const revenueQuery = prismaFake.serviceRequest.groupBy.mock.calls[1][0];
      expect(revenueQuery.where).toEqual({
        status: { notIn: ['CANCELLED', 'REJECTED'] },
      });
      expect(result.statusCounts.confirmed).toBe(1);
      expect(result.statusCounts.rejected).toBe(1);
    });
  });

  describe('internal note', () => {
    it('saves a trimmed note and removes an empty one', async () => {
      await service.update(1, { internalNote: '  Code porte 1234  ' });
      expect(prismaFake.serviceRequest.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { internalNote: 'Code porte 1234' },
        include: { maid: true },
      });

      await service.update(1, { internalNote: '   ' });
      expect(prismaFake.serviceRequest.update).toHaveBeenLastCalledWith({
        where: { id: 1 },
        data: { internalNote: null },
        include: { maid: true },
      });
    });

    it('refuses a note that is too long or is not text', async () => {
      await expect(
        service.update(1, { internalNote: 'x'.repeat(2001) }),
      ).rejects.toThrow(BadRequestException);
      await expect(service.update(1, { internalNote: 42 })).rejects.toThrow(
        BadRequestException,
      );
      expect(prismaFake.serviceRequest.update).not.toHaveBeenCalled();
    });
  });

  it('lets a logged-in admin choose status, price and payment', async () => {
    const adminDto = {
      ...visitorDto,
      maidId: undefined,
      status: 'CONFIRMED',
      totalPrice: 99,
      paymentStatus: 'PAID',
    };

    await service.create(adminDto, true);

    const data = prismaFake.serviceRequest.create.mock.calls[0][0].data;
    expect(data.status).toBe('CONFIRMED');
    expect(data.totalPrice).toBe(99);
    expect(data.paymentStatus).toBe('PAID');
  });

  it('refuses an unknown status from an admin on create', async () => {
    const adminDto = { ...visitorDto, maidId: undefined, status: 'HACKED' };

    await expect(service.create(adminDto, true)).rejects.toThrow(
      BadRequestException,
    );
    expect(prismaFake.serviceRequest.create).not.toHaveBeenCalled();
  });

  it('refuses an unknown status on the status route', async () => {
    await expect(service.updateStatus(1, 'HACKED')).rejects.toThrow(
      BadRequestException,
    );
    expect(prismaFake.$transaction).not.toHaveBeenCalled();
  });

  it('update keeps only a clean price and payment status', async () => {
    const sent = {
      totalPrice: '50',
      paymentStatus: ' paid ',
      status: 'COMPLETED',
      id: 9,
    };

    await service.update(1, sent, 3);

    expect(prismaFake.serviceRequest.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { totalPrice: 50, paymentStatus: 'PAID' },
      include: { maid: true },
    });
  });

  it('update refuses bad values and empty requests', async () => {
    await expect(service.update(1, { totalPrice: -5 })).rejects.toThrow(
      BadRequestException,
    );
    await expect(service.update(1, { paymentStatus: 'FREE' })).rejects.toThrow(
      BadRequestException,
    );
    await expect(service.update(1, { status: 'DONE' })).rejects.toThrow(
      BadRequestException,
    );
    expect(prismaFake.serviceRequest.update).not.toHaveBeenCalled();
  });
});
