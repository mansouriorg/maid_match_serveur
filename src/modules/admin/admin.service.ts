import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  // Changes the password of the logged-in admin (the id comes from the token).
  // There is no default admin account: the first admin is created with the
  // seed script (see the README).
  async changePassword(
    adminId: number,
    currentPassword: string,
    newPassword: string,
  ) {
    const admin = await this.prisma.admin.findUnique({
      where: { id: adminId },
    });
    if (admin === null) {
      throw new NotFoundException('Compte administrateur introuvable.');
    }

    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      admin.password,
    );
    if (isPasswordValid === false) {
      throw new UnauthorizedException("L'ancien mot de passe est incorrect.");
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.admin.update({
      where: { id: adminId },
      data: { password: hashedNewPassword },
    });

    return { message: 'Mot de passe mis \u00e0 jour avec succ\u00e8s.' };
  }
}
