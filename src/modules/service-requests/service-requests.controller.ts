// src/modules/service-requests/service-requests.controller.ts
import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete, 
  ParseIntPipe, 
  Query 
} from '@nestjs/common';
import { ServiceRequestsService } from './service-requests.service';
import { CreateServiceRequestDto } from './dto/create-service-request.dto';

@Controller('service-requests')
export class ServiceRequestsController {
  constructor(private readonly serviceRequestsService: ServiceRequestsService) {}

  // 1. POST /service-requests
  // Used by: Frontend Wizard (StepSummary)
  @Post()
  create(@Body() createDto: CreateServiceRequestDto) {
    return this.serviceRequestsService.create(createDto);
  }

  // 2. GET /service-requests
  // Used by: Admin Dashboard (List View) & Calendar Planning
  // Usage List: /service-requests?status=REQUESTED&search=Ahmed
  // Usage Calendar: /service-requests?minDate=2023-12-01&maxDate=2023-12-31
  @Get()
  findAll(
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('minDate') minDate?: string, // NEW: Start of calendar range
    @Query('maxDate') maxDate?: string, // NEW: End of calendar range
  ) {
    // Pass all filters to the updated service
    return this.serviceRequestsService.findAll({ 
      status, 
      search, 
      minDate, 
      maxDate 
    });
  }

  // 3. NOUVEAU : GET /service-requests/analytics
  // Used by: Admin Dashboard (Stats Cards)
  // ⚠️ DOIT TOUJOURS ÊTRE AVANT @Get(':id')
  @Get('analytics')
  async getAnalytics() {
    return this.serviceRequestsService.getAnalytics();
  }

  // 4. GET /service-requests/:id
  // Used by: Admin Dashboard (Detail View)
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.serviceRequestsService.findOne(id);
  }

  // 5. PATCH /service-requests/:id/status
  // Used by: Admin (Mark as "CONFIRMED", "COMPLETED" or "CANCELLED")
  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseIntPipe) id: number, 
    @Body('status') status: string
  ) {
    return this.serviceRequestsService.updateStatus(id, status);
  }

  // 6. PATCH /service-requests/:id/assign
  // Used by: Admin (Assign a Maid to a Request)
  // Usage: PATCH /service-requests/1/assign { "maidId": 5 }
  @Patch(':id/assign')
  assignMaid(
    @Param('id', ParseIntPipe) id: number,
    @Body('maidId', ParseIntPipe) maidId: number
  ) {
    return this.serviceRequestsService.assignMaid(id, maidId);
  }

  // 7. DELETE /service-requests/:id
  // Used by: Admin (Remove spam or cancelled requests)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.serviceRequestsService.remove(id);
  }
}