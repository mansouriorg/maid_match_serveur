import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AdminService } from './admin.service';

// The real PrismaService needs the database. A small fake is enough here.
jest.mock('../../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

describe('AdminService', () => {
  let service: AdminService;

  const prismaFake: any = {
    admin: { findUnique: jest.fn(), update: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const hash = await bcrypt.hash('old-password', 4);
    prismaFake.admin.findUnique.mockResolvedValue({ id: 7, password: hash });
    prismaFake.admin.update.mockResolvedValue({ id: 7 });
    service = new AdminService(prismaFake);
  });

  it('changes the password of the admin given by the token', async () => {
    await service.changePassword(7, 'old-password', 'new-password-123');

    expect(prismaFake.admin.findUnique).toHaveBeenCalledWith({
      where: { id: 7 },
    });
    const call = prismaFake.admin.update.mock.calls[0][0];
    expect(call.where).toEqual({ id: 7 });
    const stored = await bcrypt.compare('new-password-123', call.data.password);
    expect(stored).toBe(true);
  });

  it('refuses a wrong current password', async () => {
    await expect(
      service.changePassword(7, 'wrong-password', 'new-password-123'),
    ).rejects.toThrow(UnauthorizedException);
    expect(prismaFake.admin.update).not.toHaveBeenCalled();
  });

  it('refuses an admin that does not exist', async () => {
    prismaFake.admin.findUnique.mockResolvedValue(null);

    await expect(service.changePassword(99, 'x', 'y')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('does not create a default admin when the server starts', () => {
    expect('onModuleInit' in service).toBe(false);
  });
});
