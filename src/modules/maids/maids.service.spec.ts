import { ConflictException } from '@nestjs/common';
import { MaidsService } from './maids.service';

// The real service needs the database. A small fake is enough here.
jest.mock('../../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

describe('MaidsService', () => {
  const prismaFake: any = {
    maid: { findUnique: jest.fn(), delete: jest.fn() },
    serviceRequest: { count: jest.fn(), findMany: jest.fn() },
  };
  let service: MaidsService;

  beforeEach(() => {
    jest.clearAllMocks();
    prismaFake.maid.findUnique.mockResolvedValue({ id: 5, fullName: 'Lina' });
    prismaFake.maid.delete.mockResolvedValue({ id: 5 });
    service = new MaidsService(prismaFake);
  });

  it('refuses to delete someone who still has an assigned job', async () => {
    prismaFake.serviceRequest.count.mockResolvedValue(2);
    await expect(service.remove(5)).rejects.toThrow(ConflictException);
    expect(prismaFake.maid.delete).not.toHaveBeenCalled();
  });

  it('deletes someone who has no assigned job', async () => {
    prismaFake.serviceRequest.count.mockResolvedValue(0);
    await service.remove(5);
    expect(prismaFake.maid.delete).toHaveBeenCalledWith({ where: { id: 5 } });
  });

  it('shows the next assigned jobs on the profile', async () => {
    prismaFake.serviceRequest.findMany.mockResolvedValue([{ id: 9 }]);
    const profile = await service.findProfile(5);
    expect(profile.upcoming).toEqual([{ id: 9 }]);
    const query = prismaFake.serviceRequest.findMany.mock.calls[0][0];
    expect(query.where.maidId).toBe(5);
    expect(query.where.status).toBe('ASSIGNED');
  });
});
