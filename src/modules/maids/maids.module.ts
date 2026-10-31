import { Module } from '@nestjs/common';
import { MaidsService } from './maids.service';
import { MaidsController } from './maids.controller';

@Module({
  controllers: [MaidsController],
  providers: [MaidsService],
  // Export Service if you want to use it in other modules (like assigning a maid in ServiceRequests)
  exports: [MaidsService],
})
export class MaidsModule {}
