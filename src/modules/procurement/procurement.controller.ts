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
import { ProcurementService } from './procurement.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { PaginationDto } from '../../common/dto/pagination.dto'

@ApiTags('Procurement')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('procurement')
export class ProcurementController {
  constructor(private readonly procurementService: ProcurementService) {}

  // ─── Suppliers ───────────────────────────────────────────────────────────

  @Get('suppliers')
  @Roles('staff')
  @ApiOperation({ summary: 'List suppliers (paginated)' })
  getSuppliers(
    @Headers('x-tenant-id') tenantId: string,
    @Query() dto: PaginationDto,
  ) {
    return this.procurementService.getSuppliers(tenantId, dto)
  }

  @Post('suppliers')
  @Roles('staff')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new supplier' })
  createSupplier(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: Record<string, any>,
    @CurrentUser('id') userId: string,
  ) {
    return this.procurementService.createSupplier(tenantId, dto, userId)
  }

  @Get('suppliers/:id')
  @Roles('staff')
  @ApiOperation({ summary: 'Get a single supplier' })
  getSupplier(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.procurementService.getSupplier(tenantId, id)
  }

  @Patch('suppliers/:id')
  @Roles('staff')
  @ApiOperation({ summary: 'Update a supplier' })
  updateSupplier(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body() dto: Record<string, any>,
    @CurrentUser('id') userId: string,
  ) {
    return this.procurementService.updateSupplier(tenantId, id, dto, userId)
  }

  @Patch('suppliers/:id/blacklist')
  @Roles('admin')
  @ApiOperation({ summary: 'Blacklist a supplier (admin+)' })
  blacklistSupplier(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.procurementService.blacklistSupplier(tenantId, id, reason, userId)
  }

  // ─── Vendors ─────────────────────────────────────────────────────────────

  @Get('vendors')
  @Roles('staff')
  @ApiOperation({ summary: 'List vendors / karigars (paginated)' })
  getVendors(
    @Headers('x-tenant-id') tenantId: string,
    @Query() dto: PaginationDto,
  ) {
    return this.procurementService.getVendors(tenantId, dto)
  }

  @Post('vendors')
  @Roles('staff')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new vendor / karigar' })
  createVendor(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: Record<string, any>,
    @CurrentUser('id') userId: string,
  ) {
    return this.procurementService.createVendor(tenantId, dto, userId)
  }

  @Patch('vendors/:id')
  @Roles('staff')
  @ApiOperation({ summary: 'Update a vendor / karigar' })
  updateVendor(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body() dto: Record<string, any>,
    @CurrentUser('id') userId: string,
  ) {
    return this.procurementService.updateVendor(tenantId, id, dto, userId)
  }

  // ─── Purchase Requests ───────────────────────────────────────────────────

  @Get('purchase-requests')
  @Roles('staff')
  @ApiOperation({ summary: 'List purchase requests (paginated)' })
  getPRs(
    @Headers('x-tenant-id') tenantId: string,
    @Query() dto: PaginationDto,
  ) {
    return this.procurementService.getPRs(tenantId, dto)
  }

  @Post('purchase-requests')
  @Roles('staff')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a purchase request' })
  createPR(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: Record<string, any>,
    @CurrentUser('id') userId: string,
  ) {
    return this.procurementService.createPR(tenantId, dto, userId)
  }

  @Get('purchase-requests/:id')
  @Roles('staff')
  @ApiOperation({ summary: 'Get a single purchase request' })
  getPR(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.procurementService.getPR(tenantId, id)
  }

  @Patch('purchase-requests/:id/approve')
  @Roles('manager')
  @ApiOperation({ summary: 'Approve a purchase request (manager+)' })
  approvePR(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.procurementService.approvePR(tenantId, id, userId)
  }

  @Patch('purchase-requests/:id/reject')
  @Roles('manager')
  @ApiOperation({ summary: 'Reject a purchase request (manager+)' })
  rejectPR(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.procurementService.rejectPR(tenantId, id, reason, userId)
  }

  // ─── Purchase Orders ─────────────────────────────────────────────────────

  @Get('purchase-orders')
  @Roles('staff')
  @ApiOperation({ summary: 'List purchase orders (paginated)' })
  getPOs(
    @Headers('x-tenant-id') tenantId: string,
    @Query() dto: PaginationDto,
  ) {
    return this.procurementService.getPOs(tenantId, dto)
  }

  @Post('purchase-orders')
  @Roles('staff')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a purchase order' })
  createPO(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: Record<string, any>,
    @CurrentUser('id') userId: string,
  ) {
    return this.procurementService.createPO(tenantId, dto, userId)
  }

  @Get('purchase-orders/:id')
  @Roles('staff')
  @ApiOperation({ summary: 'Get a single purchase order' })
  getPO(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.procurementService.getPO(tenantId, id)
  }

  @Patch('purchase-orders/:id/send')
  @Roles('staff')
  @ApiOperation({ summary: 'Send a purchase order to supplier' })
  sendPO(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.procurementService.sendPO(tenantId, id, userId)
  }

  // ─── Goods Inward / GRN ──────────────────────────────────────────────────

  @Get('goods-inward')
  @Roles('staff')
  @ApiOperation({ summary: 'List goods receipt notes (paginated)' })
  getGRNs(
    @Headers('x-tenant-id') tenantId: string,
    @Query() dto: PaginationDto,
  ) {
    return this.procurementService.getGRNs(tenantId, dto)
  }

  @Post('goods-inward')
  @Roles('staff')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a goods receipt note' })
  createGRN(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: Record<string, any>,
    @CurrentUser('id') userId: string,
  ) {
    return this.procurementService.createGRN(tenantId, dto, userId)
  }

  @Get('goods-inward/:id')
  @Roles('staff')
  @ApiOperation({ summary: 'Get a single GRN' })
  getGRN(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.procurementService.getGRN(tenantId, id)
  }

  @Patch('goods-inward/:id/accept')
  @Roles('manager')
  @ApiOperation({ summary: 'Accept GRN and create inventory items (manager+)' })
  acceptGRN(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.procurementService.acceptGRN(tenantId, id, userId)
  }
}
