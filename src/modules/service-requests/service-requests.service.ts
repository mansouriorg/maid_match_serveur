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

  // --- NOUVEAU : Fonction privée pour calculer le prix ---
  private calculatePrice(dto: CreateServiceRequestDto): number {
    let pricePerHour = 15; // Prix de base : 15 TND/h

    // 1. Majoration si c'est un nettoyage en profondeur
    if (dto.cleaningType === 'deep') {
      pricePerHour += 5; // Passe à 20 TND/h
    }

    // 2. Calcul du prix de base (Heures * Prix horaire)
    let total = dto.durationHours * pricePerHour;

    // 3. Frais si la femme de ménage doit ramener ses produits
    if (dto.hasSupplies === false) {
      total += 20; // + 20 TND de frais fixes
    }

    // 4. Frais pour les extras (ex: 10 TND par extra)
    if (dto.extras && dto.extras.length > 0) {
      total += (dto.extras.length * 10); 
    }

    return total;
  }

  // 1. Create a new request (Updated with Automatic Price Calculation)
  async create(createDto: CreateServiceRequestDto) {
    // Logic: Determine initial status
    let initialStatus = createDto.status || 'REQUESTED';

    if (createDto.maidId) {
      initialStatus = 'ASSIGNED';
    }

    // CALCUL DU PRIX EXACT ICI
    const finalPrice = this.calculatePrice(createDto);

    let newRequest;

    // Use a transaction if we are assigning a maid immediately to ensure consistency
    if (createDto.maidId) {
        newRequest = await this.prisma.$transaction(async (tx) => {
            // A. Create the Request
            const request = await tx.serviceRequest.create({
                data: {
                    ...createDto,
                    startTime: new Date(createDto.startTime),
                    status: initialStatus,
                    totalPrice: finalPrice, // <-- Sauvegarde du prix calculé
                },
            });

            // B. Mark Maid as BUSY
            await tx.maid.update({
                where: { id: createDto.maidId },
                data: { status: 'BUSY' }
            });

            return request;
        });
    } else {
        // Standard Creation (No Maid assigned yet)
        newRequest = await this.prisma.serviceRequest.create({
          data: {
            ...createDto,
            startTime: new Date(createDto.startTime),
            status: initialStatus,
            totalPrice: finalPrice, // <-- Sauvegarde du prix calculé
          },
        });
    }

    // 🔥 Déclenchement de la notification (Email + WebSocket) 🔥
    this.notificationsService.notifyAdminNewRequest(newRequest).catch((err) => {
      console.error('Erreur lors de l\'envoi de la notification :', err);
    });

    return newRequest;
  }

  // 2. Get all requests (Supports Search, Status & Date Range for Planning)
  async findAll(params?: { 
    status?: string; 
    search?: string; 
    minDate?: string; 
    maxDate?: string 
  }) {
    const { status, search, minDate, maxDate } = params || {};

    return this.prisma.serviceRequest.findMany({
      where: {
        // A. Filter by Status (if provided)
        ...(status && { status }),

        // B. Filter by Date Range (For Calendar/Planning)
        ...(minDate && maxDate ? {
            startTime: {
                gte: new Date(minDate), // Start of range
                lte: new Date(maxDate), // End of range
            }
        } : {}),
        
        // C. Search by Name OR Phone (if provided)
        ...(search && {
          OR: [
            { customerName: { contains: search, mode: 'insensitive' } },
            { customerPhone: { contains: search, mode: 'insensitive' } },
          ],
        }),
      },
      // D. Sorting
      orderBy: (minDate && maxDate) ? { startTime: 'asc' } : { createdAt: 'desc' },
      include: { maid: true },
    });
  }

  // 3. Get ONE request by ID (Used for Detail View)
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

  // 4. Update Status (With Smart Logic)
  async updateStatus(id: number, status: string) {
    const request = await this.findOne(id);

    // Transaction: Update request AND Update Maid status together
    return this.prisma.$transaction(async (tx) => {
      
      // A. Update the Request Status
      const updatedRequest = await tx.serviceRequest.update({
        where: { id },
        data: { status },
        include: { maid: true }
      });

      // B. If the job is finished/cancelled, set the maid back to AVAILABLE
      if (['COMPLETED', 'CANCELLED', 'REJECTED'].includes(status) && request.maidId) {
        await tx.maid.update({
          where: { id: request.maidId },
          data: { status: 'AVAILABLE' },
        });
      }

      return updatedRequest;
    });
  }

  // 5. Assign a Maid to a Request (With Validation & Transaction)
  async assignMaid(requestId: number, maidId: number) {
    // A. Check if Request exists
    await this.findOne(requestId);

    // B. Check if Maid exists
    const maid = await this.prisma.maid.findUnique({ where: { id: maidId } });
    if (!maid) throw new NotFoundException(`Maid #${maidId} not found`);

    // C. Check if Maid is already busy
    if (maid.status === 'BUSY') {
       throw new ConflictException(`Maid ${maid.fullName} is currently busy with another mission.`);
    }

    // D. Perform updates in a Transaction (All or Nothing)
    return this.prisma.$transaction(async (tx) => {
      // 1. Mark Maid as BUSY
      await tx.maid.update({
        where: { id: maidId },
        data: { status: 'BUSY' },
      });

      // 2. Link Maid to Request and update status to ASSIGNED
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

  // 6. Delete a request (Used for cleanup/spam)
  async remove(id: number) {
    await this.findOne(id); 

    return this.prisma.serviceRequest.delete({
      where: { id },
    });
  }

  // 7. Mettre à jour les statistiques pour utiliser le VRAI prix
  async getAnalytics() {
    // A. Total des réservations
    const totalRequests = await this.prisma.serviceRequest.count();

    // B. Répartition par statut
    const statusCounts = await this.prisma.serviceRequest.groupBy({
      by: ['status'],
      _count: {
        status: true,
      },
    });

    // C. Revenu EXACT basé sur la nouvelle colonne totalPrice
    const revenueResult = await this.prisma.serviceRequest.aggregate({
      _sum: {
        durationHours: true,
        totalPrice: true, // <-- Prisma additionne tous les prix totaux !
      },
      where: {
        status: {
          not: 'CANCELLED', // On ne compte pas l'argent des réservations annulées
        },
      },
    });
    
    const totalHours = revenueResult._sum.durationHours || 0;
    const estimatedRevenue = revenueResult._sum.totalPrice || 0; // Revenu exact !

    // D. Formater les données pour le frontend
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
    };
  }
}