import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from './audit.service';
import { PrismaService } from '../../prisma/prisma.service';

// The real PrismaService needs a database and the generated Prisma client.
// AuditService only calls two Prisma methods, so a small fake is enough here.
jest.mock('../../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

describe('AuditService', () => {
  let service: AuditService;

  const prismaFake = {
    auditLog: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        { provide: PrismaService, useValue: prismaFake },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('logAction saves one audit row with the admin id', async () => {
    prismaFake.auditLog.create.mockResolvedValue({ id: 1 });

    await service.logAction('UPDATE_STATUS', 'ServiceRequest', 7, 'note', 3);

    expect(prismaFake.auditLog.create).toHaveBeenCalledWith({
      data: {
        action: 'UPDATE_STATUS',
        entity: 'ServiceRequest',
        entityId: 7,
        details: 'note',
        adminId: 3,
      },
    });
  });

  it('logAction does not throw when the database fails', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    prismaFake.auditLog.create.mockRejectedValue(new Error('db down'));

    await expect(
      service.logAction('DELETE_REQUEST', 'ServiceRequest', 1, 'note'),
    ).resolves.toBeUndefined();

    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('getLogs asks for the 100 newest rows with the admin email', async () => {
    prismaFake.auditLog.findMany.mockResolvedValue([]);

    await service.getLogs();

    expect(prismaFake.auditLog.findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { admin: { select: { email: true } } },
    });
  });
});
