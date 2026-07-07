import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
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
  ApiQuery,
} from '@nestjs/swagger'
import { InventoryService } from './inventory.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { PaginationDto } from '../../common/dto/pagination.dto'
import { ReservationForType } from '../../database/entities/stock-reservation.entity'

@ApiTags('Inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  // ─── Items ───────────────────────────────────────────────────────────────

  @Get('items')
  @Roles('staff')
  @ApiOperation({ summary: 'List inventory items (paginated)' })
  getItems(
    @Headers('x-tenant-id') tenantId: string,
    @Query() dto: PaginationDto,
  ) {
    return this.inventoryService.getItems(tenantId, dto)
  }

  @Post('items')
  @Roles('staff')
  @ApiOperation({ summary: 'Create a new inventory item' })
  createItem(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: Record<string, any>,
    @CurrentUser('id') userId: string,
  ) {
    return this.inventoryService.createItem(tenantId, dto, userId)
  }

  @Get('items/:id')
  @Roles('staff')
  @ApiOperation({ summary: 'Get a single inventory item' })
  getItem(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.inventoryService.getItem(tenantId, id)
  }

  @Patch('items/:id')
  @Roles('staff')
  @ApiOperation({ summary: 'Update an inventory item' })
  updateItem(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body() dto: Record<string, any>,
    @CurrentUser('id') userId: string,
  ) {
    return this.inventoryService.updateItem(tenantId, id, dto, userId)
  }

  @Post('items/:id/reserve')
  @Roles('staff')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Reserve stock for an order or job card' })
  reserveStock(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') itemId: string,
    @Body() body: { quantity: number; forType: ReservationForType; forId: string },
    @CurrentUser('id') userId: string,
  ) {
    return this.inventoryService.reserveStock(
      tenantId,
      itemId,
      body.quantity,
      body.forType,
      body.forId,
      userId,
    )
  }

  @Delete('items/:id/reserve/:rid')
  @Roles('manager')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Release a stock reservation' })
  releaseReservation(
    @Headers('x-tenant-id') tenantId: string,
    @Param('rid') reservationId: string,
  ) {
    return this.inventoryService.releaseReservation(tenantId, reservationId)
  }

  // ─── Locations ───────────────────────────────────────────────────────────

  @Get('locations')
  @Roles('staff')
  @ApiOperation({ summary: 'List all inventory locations as tree' })
  getLocations(@Headers('x-tenant-id') tenantId: string) {
    return this.inventoryService.getLocations(tenantId)
  }

  @Post('locations')
  @Roles('manager')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new inventory location' })
  createLocation(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: Record<string, any>,
    @CurrentUser('id') userId: string,
  ) {
    return this.inventoryService.createLocation(tenantId, dto, userId)
  }

  // ─── Transfers ───────────────────────────────────────────────────────────

  @Post('transfers')
  @Roles('staff')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Initiate a stock transfer between locations' })
  initiateTransfer(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: Record<string, any>,
    @CurrentUser('id') userId: string,
  ) {
    return this.inventoryService.initiateTransfer(tenantId, dto, userId)
  }

  @Patch('transfers/:id/complete')
  @Roles('manager')
  @ApiOperation({ summary: 'Complete a stock transfer' })
  completeTransfer(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.inventoryService.completeTransfer(tenantId, id, userId)
  }

  // ─── Adjustments ─────────────────────────────────────────────────────────

  @Post('adjustments')
  @Roles('staff')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a stock adjustment (pending approval)' })
  createAdjustment(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: Record<string, any>,
    @CurrentUser('id') userId: string,
  ) {
    return this.inventoryService.createAdjustment(tenantId, dto, userId)
  }

  @Patch('adjustments/:id/approve')
  @Roles('manager')
  @ApiOperation({ summary: 'Approve and apply a stock adjustment' })
  approveAdjustment(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.inventoryService.approveAdjustment(tenantId, id, userId)
  }

  // ─── Ledger ───────────────────────────────────────────────────────────────

  @Get('ledger')
  @Roles('staff')
  @ApiOperation({ summary: 'Get inventory ledger entries' })
  @ApiQuery({ name: 'itemId', required: false })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  getLedger(
    @Headers('x-tenant-id') tenantId: string,
    @Query('itemId') itemId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.inventoryService.getLedger(tenantId, itemId, dateFrom, dateTo)
  }

  // ─── Variances ────────────────────────────────────────────────────────────

  @Get('variances')
  @Roles('staff')
  @ApiOperation({ summary: 'Get inventory variance / adjustment history' })
  getVariances(
    @Headers('x-tenant-id') tenantId: string,
    @Query() dto: PaginationDto,
  ) {
    return this.inventoryService.getVariances(tenantId, dto)
  }

  // ─── Barcodes ─────────────────────────────────────────────────────────────

  @Get('barcodes/:code')
  @Roles('staff')
  @ApiOperation({ summary: 'Look up an item by barcode or QR code' })
  lookupBarcode(
    @Headers('x-tenant-id') tenantId: string,
    @Param('code') code: string,
  ) {
    return this.inventoryService.lookupBarcode(tenantId, code)
  }
}
