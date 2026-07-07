import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
  Headers,
} from '@nestjs/common'
import { Request } from 'express'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { CurrencyService } from './currency.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { Public } from '../../common/decorators/public.decorator'

const DEFAULT_TENANT = '00000000-0000-0000-0000-000000000001'

@ApiTags('currencies')
@Controller('currencies')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CurrencyController {
  constructor(private readonly service: CurrencyService) {}

  // ─── Public storefront endpoints ───────────────────────────────────────────

  @Public()
  @Get()
  @ApiOperation({ summary: 'List active currencies (public, storefront)' })
  listActive(@Headers('x-tenant-id') tenantId: string) {
    return this.service.listActive(tenantId || DEFAULT_TENANT)
  }

  @Public()
  @Get('geo')
  @ApiOperation({ summary: 'Detect visitor country from IP → matching currency' })
  async geo(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-forwarded-for') xff: string,
    @Req() req: Request,
  ) {
    const ip = xff || (req as any).ip || req.socket?.remoteAddress || ''
    return this.service.detectByIp(tenantId || DEFAULT_TENANT, ip)
  }

  // ─── Admin endpoints ───────────────────────────────────────────────────────

  @Get('admin/all')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all currencies incl. inactive (admin)' })
  listAll(
    @CurrentUser('tenantId') tenantId: string,
    @Headers('x-tenant-id') headerTenantId: string,
  ) {
    return this.service.listAll(tenantId || headerTenantId || DEFAULT_TENANT)
  }

  @Post('refresh-rates')
  @Roles('admin', 'manager', 'super_admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Fetch live FX rates and persist (admin)' })
  refresh(
    @CurrentUser('tenantId') tenantId: string,
    @Headers('x-tenant-id') headerTenantId: string,
  ) {
    return this.service.refreshRates(tenantId || headerTenantId || DEFAULT_TENANT)
  }

  @Post('seed')
  @Roles('admin', 'super_admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Seed default currency set (admin)' })
  seed(
    @CurrentUser('tenantId') tenantId: string,
    @Headers('x-tenant-id') headerTenantId: string,
  ) {
    return this.service.seed(tenantId || headerTenantId || DEFAULT_TENANT)
  }

  @Post()
  @Roles('admin', 'manager', 'super_admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a currency/country (admin)' })
  create(
    @CurrentUser('tenantId') tenantId: string,
    @Headers('x-tenant-id') headerTenantId: string,
    @Body() dto: Record<string, any>,
  ) {
    return this.service.create(tenantId || headerTenantId || DEFAULT_TENANT, dto)
  }

  @Put(':id')
  @Roles('admin', 'manager', 'super_admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a currency (admin)' })
  update(
    @CurrentUser('tenantId') tenantId: string,
    @Headers('x-tenant-id') headerTenantId: string,
    @Param('id') id: string,
    @Body() dto: Record<string, any>,
  ) {
    return this.service.update(tenantId || headerTenantId || DEFAULT_TENANT, id, dto)
  }

  @Patch(':id/default')
  @Roles('admin', 'manager', 'super_admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Set a currency as the storefront default (admin)' })
  setDefault(
    @CurrentUser('tenantId') tenantId: string,
    @Headers('x-tenant-id') headerTenantId: string,
    @Param('id') id: string,
  ) {
    return this.service.setDefault(tenantId || headerTenantId || DEFAULT_TENANT, id)
  }

  @Delete(':id')
  @Roles('admin', 'super_admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a currency (admin)' })
  remove(
    @CurrentUser('tenantId') tenantId: string,
    @Headers('x-tenant-id') headerTenantId: string,
    @Param('id') id: string,
  ) {
    return this.service.remove(tenantId || headerTenantId || DEFAULT_TENANT, id)
  }
}
