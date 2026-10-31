import { BadRequestException } from '@nestjs/common';
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
    },
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
