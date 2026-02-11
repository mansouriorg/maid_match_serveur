import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// Your custom path is fine now because the adapter handles the connection logic
import { PrismaClient } from 'generated/prisma/client'; 
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  // Store the pool so we can access it later if needed (optional but good for debugging)
  private pool: Pool;

  constructor(config: ConfigService) {
    const connectionString = config.getOrThrow<string>('DATABASE_URL');
    
    // 1. Create the Postgres Pool
    const pool = new Pool({ connectionString });
    
    // 2. Create the Prisma Adapter
    const adapter = new PrismaPg(pool);

    // 3. Pass options to the parent
    super({ adapter });
    
    this.pool = pool;
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    // This disconnects the adapter
    await this.$disconnect();
    // Explicitly ending the pool ensures the app shuts down immediately
    await this.pool.end(); 
  }
}