import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardStats() {
    // 1. Count requests by status
    const totalRequests = await this.prisma.serviceRequest.count();
    
    const pendingRequests = await this.prisma.serviceRequest.count({
      where: { status: 'PENDING' },
    });

    const completedRequests = await this.prisma.serviceRequest.count({
      where: { status: 'COMPLETED' },
    });

    // 2. Count your total maids
    // (Ensure you have the Maid model in prisma/schema.prisma)
    const totalMaids = await this.prisma.maid.count();

    // 3. Get the 5 most recent requests for the "Quick View" widget
    const recentRequests = await this.prisma.serviceRequest.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
    });

    return {
      overview: {
        totalRequests,
        pendingRequests,
        completedRequests,
        totalMaids,
      },
      recentActivity: recentRequests,
    };
  }
}