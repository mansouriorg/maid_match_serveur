import { 
  Injectable, 
  OnModuleInit, 
  UnauthorizedException, 
  NotFoundException 
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  // 1. Initialisation : Créer un admin par défaut si la table est vide
  async onModuleInit() {
    const adminCount = await this.prisma.admin.count();
    if (adminCount === 0) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await this.prisma.admin.create({
        data: {
          email: 'admin@nobreach.com',
          password: hashedPassword, // Sauvegardé de manière cryptée !
        },
      });
      console.log('✅ Compte Admin par défaut créé (admin@nobreach.com / admin123)');
    }
  }

  // 2. Logique de changement de mot de passe
  async changePassword(currentPassword: string, newPassword: string) {
    // A. Récupérer l'admin (On suppose que tu es le seul admin, ID 1)
    const admin = await this.prisma.admin.findUnique({ where: { id: 1 } });
    if (!admin) {
      throw new NotFoundException("Compte administrateur introuvable.");
    }

    // B. Vérifier que l'ancien mot de passe est correct
    const isPasswordValid = await bcrypt.compare(currentPassword, admin.password);
    if (!isPasswordValid) {
      // On rejette la requête si le mot de passe actuel est faux
      throw new UnauthorizedException("L'ancien mot de passe est incorrect.");
    }

    // C. Hasher le nouveau mot de passe
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // D. Mettre à jour la base de données
    await this.prisma.admin.update({
      where: { id: 1 },
      data: { password: hashedNewPassword },
    });

    return { message: "Mot de passe mis à jour avec succès." };
  }
}