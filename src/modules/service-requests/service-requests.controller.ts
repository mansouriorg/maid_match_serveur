import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  Query,
  Request,
} from '@nestjs/common';
import { ServiceRequestsService } from './service-requests.service';
import { CreateServiceRequestDto } from './dto/create-service-request.dto';
import { QuoteDto } from './dto/quote.dto';
import { Public } from '../auth/public.decorator';
import { Throttle } from '@nestjs/throttler';

// What the login token gives us (see JwtStrategy.validate).
type AuthedRequest = { user?: { userId?: number } };

@Controller('service-requests')
export class ServiceRequestsController {
  constructor(
    private readonly serviceRequestsService: ServiceRequestsService,
  ) {}

  // 1. POST /service-requests
  // PUBLIC. Used by: booking wizard on the public site (StepSummary)
  @Public()
  // At most 10 bookings every 10 minutes from one address (anti spam).
  @Throttle({ default: { limit: 10, ttl: 600000 } })
  @Post()
  create(
    @Body() createDto: CreateServiceRequestDto,
    @Request() req: AuthedRequest,
  ) {
    return this.serviceRequestsService.create(createDto, Boolean(req.user));
  }

  // 1b. POST /service-requests/quote
  // PUBLIC. Used by: booking wizard summary, to show the price the API will
  // save with the booking. Nothing is saved.
  @Public()
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Post('quote')
  quote(@Body() quoteDto: QuoteDto) {
    return this.serviceRequestsService.quote(quoteDto);
  }

  // 2. GET /service-requests  // Admin only. Used by: dashboard list and calendar planning
  @Get()
  findAll(
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('minDate') minDate?: string, // Start of calendar range
    @Query('maxDate') maxDate?: string, // End of calendar range
  ) {
    return this.serviceRequestsService.findAll({
      status,
      search,
      minDate,
      maxDate,
    });
  }

  // 3. GET /service-requests/analytics
  // Admin only. Used by: dashboard stats cards
  // MUST ALWAYS COME BEFORE @Get(':id')
  @Get('analytics')
  async getAnalytics() {
    return this.serviceRequestsService.getAnalytics();
  }

  // 4. GET /service-requests/:id
  // Admin only. Used by: detail view
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.serviceRequestsService.findOne(id);
  }

  // 5. PATCH /service-requests/:id/status
  // Admin only. Mark as "CONFIRMED", "COMPLETED" or "CANCELLED"
  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: string,
    @Request() req: AuthedRequest,
  ) {
    return this.serviceRequestsService.updateStatus(
      id,
      status,
      req.user?.userId,
    );
  }

  // 6. PATCH /service-requests/:id/assign
  // Admin only. Assign a maid to a request
  @Patch(':id/assign')
  assignMaid(
    @Param('id', ParseIntPipe) id: number,
    @Body('maidId', ParseIntPipe) maidId: number,
    @Request() req: AuthedRequest,
  ) {
    return this.serviceRequestsService.assignMaid(id, maidId, req.user?.userId);
  }

  // 7. PATCH /service-requests/:id
  // Admin only. Update general fields like paymentStatus
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateData: any,
    @Request() req: AuthedRequest,
  ) {
    return this.serviceRequestsService.update(id, updateData, req.user?.userId);
  }

  // 8. DELETE /service-requests/:id
  // Admin only. Remove spam or cancelled requests
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Request() req: AuthedRequest) {
    return this.serviceRequestsService.remove(id, req.user?.userId);
  }
}
