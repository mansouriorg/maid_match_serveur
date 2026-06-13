// src/modules/service-requests/service-requests.service.ts
import { 
  Injectable, 
  NotFoundException, 
  ConflictException 
} from '@nestjs/common';
import { CreateServiceRequestDto } from './dto/create-service-request.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service'; 

@Injectable()
export class ServiceRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService 
  ) {}

  // --- NOUVEAU : Fonction privée ASYNCHRONE pour calculer le prix depuis la BDD ---
  private async calculatePrice(dto: CreateServiceRequestDto): Promise<number> {
    // 1. On récupère les paramètres dynamiques depuis la base de données
    const settings = await this.prisma.settings.findUnique({ where: { id: 1 } });
    
    // 2. On utilise le tarif défini par l'admin, ou 15 en solution de secours
    let pricePerHour = settings?.defaultHourlyRate || 15; 

    // 3. Majoration si c'est un nettoyage en profondeur
    if (dto.cleaningType === 'deep') {
      pricePerHour += 5; 
    }

    // 4. Calcul du prix de base (Heures * Prix horaire dynamique)
    let total = dto.durationHours * pricePerHour;

    // 5. Frais si la femme de ménage doit ramener ses produits
    if (dto.hasSupplies === false) {
      total += 20; 
    }

    // 6. Frais pour les extras (ex: 10 TND par extra)
    if (dto.extras && dto.extras.length > 0) {
      total += (dto.extras.length * 10); 
    }

    return total;
  }

  // 1. Create a new request (Updated with Dynamic Price & Payment Status)
  async create(createDto: CreateServiceRequestDto) {
    let initialStatus = createDto.status || 'REQUESTED';

    if (createDto.maidId) {
      initialStatus = 'ASSIGNED';
    }

    // CALCUL DU PRIX EXACT ICI
    const finalPrice = createDto.totalPrice || await this.calculatePrice(createDto);
    // On prend le statut de paiement s'il est envoyé, sinon c'est PENDING par défaut.
    const paymentStat = createDto.paymentStatus || 'PENDING';

    let newRequest;

    if (createDto.maidId) {
        newRequest = await this.prisma.$transaction(async (tx) => {
            const request = await tx.serviceRequest.create({
                data: {
                    ...createDto,
                    startTime: new Date(createDto.startTime),
                    status: initialStatus,
                    totalPrice: finalPrice, 
                    paymentStatus: paymentStat, // NOUVEAU
                },
            });

            await tx.maid.update({
                where: { id: createDto.maidId },
                data: { status: 'BUSY' }
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
            paymentStatus: paymentStat, // NOUVEAU
          },
        });
    }

    this.notificationsService.notifyAdminNewRequest(newRequest).catch((err) => {
      console.error('Erreur lors de l\'envoi de la notification :', err);
    });

    return newRequest;
  }

  // 2. Get all requests
  async findAll(params?: { 
    status?: string; 
    search?: string; 
    minDate?: string; 
    maxDate?: string 
  }) {
    const { status, search, minDate, maxDate } = params || {};

    return this.prisma.serviceRequest.findMany({
      where: {
        ...(status && { status }),
        ...(minDate && maxDate ? {
            startTime: {
                gte: new Date(minDate), 
                lte: new Date(maxDate), 
            }
        } : {}),
        ...(search && {
          OR: [
            { customerName: { contains: search, mode: 'insensitive' } },
            { customerPhone: { contains: search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: (minDate && maxDate) ? { startTime: 'asc' } : { createdAt: 'desc' },
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

  // 4. Update Status (Workflow)
  async updateStatus(id: number, status: string) {
    const request = await this.findOne(id);

    return this.prisma.$transaction(async (tx) => {
      const updatedRequest = await tx.serviceRequest.update({
        where: { id },
        data: { status },
        include: { maid: true }
      });

      if (['COMPLETED', 'CANCELLED', 'REJECTED'].includes(status) && request.maidId) {
        await tx.maid.update({
          where: { id: request.maidId },
          data: { status: 'AVAILABLE' },
        });
      }

      return updatedRequest;
    });
  }

  // 5. Assign a Maid
  async assignMaid(requestId: number, maidId: number) {
    await this.findOne(requestId);

    const maid = await this.prisma.maid.findUnique({ where: { id: maidId } });
    if (!maid) throw new NotFoundException(`Maid #${maidId} not found`);

    if (maid.status === 'BUSY') {
       throw new ConflictException(`Maid ${maid.fullName} is currently busy with another mission.`);
    }

    return this.prisma.$transaction(async (tx) => {
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
  }

  // 6. NOUVEAU : Update General Fields (For Payment Status changes)
  async update(id: number, updateData: any) {
    await this.findOne(id);

    // On utilise updateData qui peut contenir { paymentStatus: 'PAID' }
    return this.prisma.serviceRequest.update({
      where: { id },
      data: updateData,
      include: { maid: true }
    });
  }

  // 7. Delete a request
  async remove(id: number) {
    await this.findOne(id); 

    return this.prisma.serviceRequest.delete({
      where: { id },
    });
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

    // C. Revenu EXACT basé sur la nouvelle colonne totalPrice
    // NOUVEAU : On ajoute aussi les revenus ENCAISSÉS vs ATTENDUS
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
      
    // Calcul de l'argent total estimé
    let estimatedRevenue = 0;
    // Calcul de l'argent réellement encaissé (PAID)
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

    const formattedStatusCounts = statusCounts.reduce((acc, curr) => {
      acc[curr.status] = curr._count.status;
      return acc;
    }, {} as Record<string, number>);

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
      collectedRevenue // Optionnel : l'argent réellement dans ta poche !
    };
  }
}