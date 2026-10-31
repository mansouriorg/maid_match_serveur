import { Controller, Get } from '@nestjs/common';
import { AuditService } from './audit.service';

@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  // GET /audit -> Récupère les 100 dernières actions
  @Get()
  getLogs() {
    return this.auditService.getLogs();
  }
}
