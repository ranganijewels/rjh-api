import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { CouponsService } from './coupons.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { Public } from '../../common/decorators/public.decorator'

@ApiTags('coupons')
@Controller('coupons')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CouponsController {
  constructor(private readonly service: CouponsService) {}

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all coupons (admin)' })
  list(
    @CurrentUser('tenantId') tenantId: string,
    @Headers('x-tenant-id') headerTenantId: string,
  ) {
    return this.service.list(tenantId || headerTenantId)
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a coupon by id' })
  get(
    @CurrentUser('tenantId') tenantId: string,
    @Headers('x-tenant-id') headerTenantId: string,
    @Param('id') id: string,
  ) {
    return this.service.get(tenantId || headerTenantId, id)
  }

  @Post()
  @Roles('admin', 'manager')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a coupon' })
  create(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Headers('x-tenant-id') headerTenantId: string,
    @Body() dto: Record<string, any>,
  ) {
    return this.service.create(tenantId || headerTenantId, dto, userId)
  }

  @Put(':id')
  @Roles('admin', 'manager')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a coupon' })
  update(
    @CurrentUser('tenantId') tenantId: string,
    @Headers('x-tenant-id') headerTenantId: string,
    @Param('id') id: string,
    @Body() dto: Record<string, any>,
  ) {
    return this.service.update(tenantId || headerTenantId, id, dto)
  }

  @Delete(':id')
  @Roles('admin')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a coupon' })
  remove(
    @CurrentUser('tenantId') tenantId: string,
    @Headers('x-tenant-id') headerTenantId: string,
    @Param('id') id: string,
  ) {
    return this.service.remove(tenantId || headerTenantId, id)
  }

  @Public()
  @Post('validate')
  @ApiOperation({ summary: 'Validate a coupon code against an order total (public)' })
  validate(
    @Headers('x-tenant-id') headerTenantId: string,
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: { code: string; orderTotal: number },
  ) {
    return this.service.validate(tenantId || headerTenantId, dto.code, dto.orderTotal)
  }
}
