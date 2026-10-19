import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  Headers,
  UseGuards,
  Version,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
} from '@nestjs/swagger'
import { OrdersService } from './orders.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { PaginationDto } from '../../common/dto/pagination.dto'
import { ProductionStatus } from '../../database/entities/job-card.entity'

@ApiTags('Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // ─── Orders ───────────────────────────────────────────────────────────────

  @Get()
  @Roles('staff')
  @ApiOperation({ summary: 'List orders — staff sees all, customers scoped to own orders' })
  getOrders(
    @Headers('x-tenant-id') tenantId: string,
    @Query() dto: PaginationDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.ordersService.getOrders(tenantId, dto, userId, role)
  }

  @Post()
  @Roles('staff')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new order' })
  createOrder(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: Record<string, any>,
    @CurrentUser('id') userId: string,
  ) {
    return this.ordersService.createOrder(tenantId, dto, userId)
  }

  @Get('job-cards')
  @Roles('staff')
  @ApiOperation({ summary: 'List all job cards (paginated)' })
  getJobCards(
    @Headers('x-tenant-id') tenantId: string,
    @Query() dto: PaginationDto,
  ) {
    return this.ordersService.getJobCards(tenantId, dto)
  }

  @Get('job-cards/:id')
  @Roles('staff')
  @ApiOperation({ summary: 'Get a single job card' })
  getJobCard(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.ordersService.getJobCard(tenantId, id)
  }

  @Patch('job-cards/:id')
  @Roles('staff')
  @ApiOperation({ summary: 'Update production fields on a job card' })
  updateJobCard(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body() dto: Record<string, any>,
    @CurrentUser('id') userId: string,
  ) {
    return this.ordersService.updateJobCard(tenantId, id, dto, userId)
  }

  @Patch('job-cards/:id/status')
  @Roles('staff')
  @ApiOperation({ summary: 'Transition job card production status' })
  updateJobCardStatus(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body('status') status: ProductionStatus,
    @CurrentUser('id') userId: string,
  ) {
    return this.ordersService.updateJobCardStatus(tenantId, id, status, userId)
  }

  @Get(':id')
  @Roles('staff')
  @ApiOperation({ summary: 'Get a single order with its job card' })
  getOrder(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.ordersService.getOrder(tenantId, id)
  }

  @Patch(':id/status')
  @Roles('staff')
  @ApiOperation({ summary: 'Update order status + shipping tracking' })
  updateStatus(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body() body: Record<string, any>,
    @CurrentUser('id') userId: string,
  ) {
    return this.ordersService.updateStatus(tenantId, id, body, userId)
  }

  // Mark / unmark a staff or QA order as a test order (excluded from reporting).
  @Patch(':id/test')
  @Roles('manager')
  @ApiOperation({ summary: 'Flag an order as a test order (excluded from revenue/reporting)' })
  setTest(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body('isTest') isTest: boolean,
  ) {
    return this.ordersService.setTestFlag(tenantId, id, !!isTest)
  }

  @Post(':id/job-card')
  @Roles('staff')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a job card linked to an order' })
  createJobCard(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') orderId: string,
    @Body() dto: Record<string, any>,
    @CurrentUser('id') userId: string,
  ) {
    return this.ordersService.createJobCard(tenantId, orderId, dto, userId)
  }
}
