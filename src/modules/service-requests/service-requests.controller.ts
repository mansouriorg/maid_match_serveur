import { Controller, Get, Post, Body, Patch, Param, ParseIntPipe } from '@nestjs/common';
import { ServiceRequestsService } from './service-requests.service';
import { CreateServiceRequestDto } from './dto/create-service-request.dto';

@Controller('service-requests')
export class ServiceRequestsController {
  constructor(private readonly serviceRequestsService: ServiceRequestsService) {}

  // POST /service-requests
  // This is where your Frontend Form sends data
  @Post()
  create(@Body() createDto: CreateServiceRequestDto) {
    return this.serviceRequestsService.create(createDto);
  }

  // GET /service-requests
  // This is for your Admin Dashboard
  @Get()
  findAll() {
    return this.serviceRequestsService.findAll();
  }

  // PATCH /service-requests/:id/status
  // Admin marks request as "CONTACTED"
  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseIntPipe) id: number, 
    @Body('status') status: string
  ) {
    return this.serviceRequestsService.updateStatus(id, status);
  }
}