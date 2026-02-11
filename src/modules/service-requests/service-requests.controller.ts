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

  // 2. GET /service-requests?status=REQUESTED
  // Used by: Admin Dashboard (List View)
  // Supports optional query param: /service-requests?status=PENDING
  @Get()
  findAll(@Query('status') status?: string) {
    return this.serviceRequestsService.findAll(status);
  }

  // 3. GET /service-requests/:id
  // Used by: Admin Dashboard (Detail View)
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.serviceRequestsService.findOne(id);
  }

  // 4. PATCH /service-requests/:id/status
  // Used by: Admin (Mark as "CONFIRMED" or "COMPLETED")
  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseIntPipe) id: number, 
    @Body('status') status: string
  ) {
    return this.serviceRequestsService.updateStatus(id, status);
  }

  // 5. PATCH /service-requests/:id/assign
  // Used by: Admin (Assign a Maid to a Request)
  // Payload: { "maidId": 5 }
  @Patch(':id/assign')
  assignMaid(
    @Param('id', ParseIntPipe) id: number,
    @Body('maidId', ParseIntPipe) maidId: number
  ) {
    return this.serviceRequestsService.assignMaid(id, maidId);
  }

  // 6. DELETE /service-requests/:id
  // Used by: Admin (Remove spam or cancelled requests)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.serviceRequestsService.remove(id);
  }
}