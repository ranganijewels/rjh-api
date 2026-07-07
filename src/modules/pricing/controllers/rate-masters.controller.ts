import {
  Controller, Get, Post, Put, Delete, Body, Param, Query, Headers, UseGuards,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../../common/guards/roles.guard'
import { Roles } from '../../../common/decorators/roles.decorator'
import { Public } from '../../../common/decorators/public.decorator'
import { CurrentUser } from '../../../common/decorators/current-user.decorator'
import { BaseRateService } from '../services/base-rate.service'
import { MetalRateService } from '../services/metal-rate.service'
import { DiamondRateService } from '../services/diamond-rate.service'
import { LaborRateService } from '../services/labor-rate.service'
import { TaxRateService } from '../services/tax-rate.service'
import { ShippingRateService } from '../services/shipping-rate.service'
import { AdditionalChargeService } from '../services/additional-charge.service'
import { DiamondMetalWeightService } from '../services/diamond-metal-weight.service'
import { PricingEngineService } from '../services/pricing-engine.service'

const T = '00000000-0000-0000-0000-000000000001'
const tn = (u?: string, h?: string) => u || h || T

// Plain (non-decorated) base holding shared CRUD logic. Concrete controllers
// below expose the decorated routes and delegate here.
abstract class RateCrud<S extends BaseRateService<any>> {
  protected constructor(
    protected readonly service: S,
    protected readonly engine: PricingEngineService,
  ) {}

  protected doList(h: string, active?: string) {
    return active === 'true' ? this.service.listActive(tn(null, h)) : this.service.list(tn(null, h))
  }
  protected doGet(h: string, id: string) {
    return this.service.get(tn(null, h), id)
  }
  protected async doCreate(u: string, uid: string, h: string, dto: any) {
    const r = await this.service.create(tn(u, h), dto, uid)
    this.engine.invalidateCache()
    return r
  }
  protected async doBulk(u: string, uid: string, h: string, items: any[]) {
    const r = await this.service.bulkCreate(tn(u, h), items ?? [], uid)
    this.engine.invalidateCache()
    return r
  }
  protected async doUpdate(u: string, h: string, id: string, dto: any) {
    const r = await this.service.update(tn(u, h), id, dto)
    this.engine.invalidateCache()
    return r
  }
  protected async doRemove(u: string, h: string, id: string) {
    const r = await this.service.remove(tn(u, h), id)
    this.engine.invalidateCache()
    return r
  }
}

@ApiTags('pricing-masters')
@Controller('metal-rates')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MetalRateController extends RateCrud<MetalRateService> {
  constructor(s: MetalRateService, e: PricingEngineService) { super(s, e) }
  @Get() @Public() list(@Headers('x-tenant-id') h: string, @Query('active') a?: string) { return this.doList(h, a) }
  @Get(':id') @Public() get(@Headers('x-tenant-id') h: string, @Param('id') id: string) { return this.doGet(h, id) }
  @Post('bulk') @Roles('admin', 'manager', 'super_admin') @ApiBearerAuth() bulk(@CurrentUser('tenantId') u: string, @CurrentUser('id') uid: string, @Headers('x-tenant-id') h: string, @Body() b: any) { return this.doBulk(u, uid, h, b.items) }
  @Post() @Roles('admin', 'manager', 'super_admin') @ApiBearerAuth() create(@CurrentUser('tenantId') u: string, @CurrentUser('id') uid: string, @Headers('x-tenant-id') h: string, @Body() d: any) { return this.doCreate(u, uid, h, d) }
  @Put(':id') @Roles('admin', 'manager', 'super_admin') @ApiBearerAuth() update(@CurrentUser('tenantId') u: string, @Headers('x-tenant-id') h: string, @Param('id') id: string, @Body() d: any) { return this.doUpdate(u, h, id, d) }
  @Delete(':id') @Roles('admin', 'super_admin') @ApiBearerAuth() remove(@CurrentUser('tenantId') u: string, @Headers('x-tenant-id') h: string, @Param('id') id: string) { return this.doRemove(u, h, id) }
}

@ApiTags('pricing-masters')
@Controller('diamond-rates')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DiamondRateController extends RateCrud<DiamondRateService> {
  constructor(s: DiamondRateService, e: PricingEngineService) { super(s, e) }
  @Get() @Public() list(@Headers('x-tenant-id') h: string, @Query('active') a?: string) { return this.doList(h, a) }
  @Get(':id') @Public() get(@Headers('x-tenant-id') h: string, @Param('id') id: string) { return this.doGet(h, id) }
  @Post('bulk') @Roles('admin', 'manager', 'super_admin') @ApiBearerAuth() bulk(@CurrentUser('tenantId') u: string, @CurrentUser('id') uid: string, @Headers('x-tenant-id') h: string, @Body() b: any) { return this.doBulk(u, uid, h, b.items) }
  @Post() @Roles('admin', 'manager', 'super_admin') @ApiBearerAuth() create(@CurrentUser('tenantId') u: string, @CurrentUser('id') uid: string, @Headers('x-tenant-id') h: string, @Body() d: any) { return this.doCreate(u, uid, h, d) }
  @Put(':id') @Roles('admin', 'manager', 'super_admin') @ApiBearerAuth() update(@CurrentUser('tenantId') u: string, @Headers('x-tenant-id') h: string, @Param('id') id: string, @Body() d: any) { return this.doUpdate(u, h, id, d) }
  @Delete(':id') @Roles('admin', 'super_admin') @ApiBearerAuth() remove(@CurrentUser('tenantId') u: string, @Headers('x-tenant-id') h: string, @Param('id') id: string) { return this.doRemove(u, h, id) }
}

@ApiTags('pricing-masters')
@Controller('labor-rates')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LaborRateController extends RateCrud<LaborRateService> {
  constructor(s: LaborRateService, e: PricingEngineService) { super(s, e) }
  @Get() @Public() list(@Headers('x-tenant-id') h: string, @Query('active') a?: string) { return this.doList(h, a) }
  @Get(':id') @Public() get(@Headers('x-tenant-id') h: string, @Param('id') id: string) { return this.doGet(h, id) }
  @Post('bulk') @Roles('admin', 'manager', 'super_admin') @ApiBearerAuth() bulk(@CurrentUser('tenantId') u: string, @CurrentUser('id') uid: string, @Headers('x-tenant-id') h: string, @Body() b: any) { return this.doBulk(u, uid, h, b.items) }
  @Post() @Roles('admin', 'manager', 'super_admin') @ApiBearerAuth() create(@CurrentUser('tenantId') u: string, @CurrentUser('id') uid: string, @Headers('x-tenant-id') h: string, @Body() d: any) { return this.doCreate(u, uid, h, d) }
  @Put(':id') @Roles('admin', 'manager', 'super_admin') @ApiBearerAuth() update(@CurrentUser('tenantId') u: string, @Headers('x-tenant-id') h: string, @Param('id') id: string, @Body() d: any) { return this.doUpdate(u, h, id, d) }
  @Delete(':id') @Roles('admin', 'super_admin') @ApiBearerAuth() remove(@CurrentUser('tenantId') u: string, @Headers('x-tenant-id') h: string, @Param('id') id: string) { return this.doRemove(u, h, id) }
}

@ApiTags('pricing-masters')
@Controller('tax-rates')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TaxRateController extends RateCrud<TaxRateService> {
  constructor(s: TaxRateService, e: PricingEngineService) { super(s, e) }
  @Get() @Public() list(@Headers('x-tenant-id') h: string, @Query('active') a?: string) { return this.doList(h, a) }
  @Get(':id') @Public() get(@Headers('x-tenant-id') h: string, @Param('id') id: string) { return this.doGet(h, id) }
  @Post('bulk') @Roles('admin', 'manager', 'super_admin') @ApiBearerAuth() bulk(@CurrentUser('tenantId') u: string, @CurrentUser('id') uid: string, @Headers('x-tenant-id') h: string, @Body() b: any) { return this.doBulk(u, uid, h, b.items) }
  @Post() @Roles('admin', 'manager', 'super_admin') @ApiBearerAuth() create(@CurrentUser('tenantId') u: string, @CurrentUser('id') uid: string, @Headers('x-tenant-id') h: string, @Body() d: any) { return this.doCreate(u, uid, h, d) }
  @Put(':id') @Roles('admin', 'manager', 'super_admin') @ApiBearerAuth() update(@CurrentUser('tenantId') u: string, @Headers('x-tenant-id') h: string, @Param('id') id: string, @Body() d: any) { return this.doUpdate(u, h, id, d) }
  @Delete(':id') @Roles('admin', 'super_admin') @ApiBearerAuth() remove(@CurrentUser('tenantId') u: string, @Headers('x-tenant-id') h: string, @Param('id') id: string) { return this.doRemove(u, h, id) }
}

@ApiTags('pricing-masters')
@Controller('shipping-rates')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ShippingRateController extends RateCrud<ShippingRateService> {
  constructor(s: ShippingRateService, e: PricingEngineService) { super(s, e) }
  @Get() @Public() list(@Headers('x-tenant-id') h: string, @Query('active') a?: string) { return this.doList(h, a) }
  @Get(':id') @Public() get(@Headers('x-tenant-id') h: string, @Param('id') id: string) { return this.doGet(h, id) }
  @Post('bulk') @Roles('admin', 'manager', 'super_admin') @ApiBearerAuth() bulk(@CurrentUser('tenantId') u: string, @CurrentUser('id') uid: string, @Headers('x-tenant-id') h: string, @Body() b: any) { return this.doBulk(u, uid, h, b.items) }
  @Post() @Roles('admin', 'manager', 'super_admin') @ApiBearerAuth() create(@CurrentUser('tenantId') u: string, @CurrentUser('id') uid: string, @Headers('x-tenant-id') h: string, @Body() d: any) { return this.doCreate(u, uid, h, d) }
  @Put(':id') @Roles('admin', 'manager', 'super_admin') @ApiBearerAuth() update(@CurrentUser('tenantId') u: string, @Headers('x-tenant-id') h: string, @Param('id') id: string, @Body() d: any) { return this.doUpdate(u, h, id, d) }
  @Delete(':id') @Roles('admin', 'super_admin') @ApiBearerAuth() remove(@CurrentUser('tenantId') u: string, @Headers('x-tenant-id') h: string, @Param('id') id: string) { return this.doRemove(u, h, id) }
}

@ApiTags('pricing-masters')
@Controller('additional-charges')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdditionalChargeController extends RateCrud<AdditionalChargeService> {
  constructor(s: AdditionalChargeService, e: PricingEngineService) { super(s, e) }
  @Get() @Public() list(@Headers('x-tenant-id') h: string, @Query('active') a?: string) { return this.doList(h, a) }
  @Get(':id') @Public() get(@Headers('x-tenant-id') h: string, @Param('id') id: string) { return this.doGet(h, id) }
  @Post('bulk') @Roles('admin', 'manager', 'super_admin') @ApiBearerAuth() bulk(@CurrentUser('tenantId') u: string, @CurrentUser('id') uid: string, @Headers('x-tenant-id') h: string, @Body() b: any) { return this.doBulk(u, uid, h, b.items) }
  @Post() @Roles('admin', 'manager', 'super_admin') @ApiBearerAuth() create(@CurrentUser('tenantId') u: string, @CurrentUser('id') uid: string, @Headers('x-tenant-id') h: string, @Body() d: any) { return this.doCreate(u, uid, h, d) }
  @Put(':id') @Roles('admin', 'manager', 'super_admin') @ApiBearerAuth() update(@CurrentUser('tenantId') u: string, @Headers('x-tenant-id') h: string, @Param('id') id: string, @Body() d: any) { return this.doUpdate(u, h, id, d) }
  @Delete(':id') @Roles('admin', 'super_admin') @ApiBearerAuth() remove(@CurrentUser('tenantId') u: string, @Headers('x-tenant-id') h: string, @Param('id') id: string) { return this.doRemove(u, h, id) }
}

@ApiTags('pricing-masters')
@Controller('diamond-metal-weights')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DiamondMetalWeightController extends RateCrud<DiamondMetalWeightService> {
  constructor(s: DiamondMetalWeightService, e: PricingEngineService) { super(s, e) }
  @Get() @Public() list(@Headers('x-tenant-id') h: string, @Query('active') a?: string) { return this.doList(h, a) }
  @Get(':id') @Public() get(@Headers('x-tenant-id') h: string, @Param('id') id: string) { return this.doGet(h, id) }
  @Post('bulk') @Roles('admin', 'manager', 'super_admin') @ApiBearerAuth() bulk(@CurrentUser('tenantId') u: string, @CurrentUser('id') uid: string, @Headers('x-tenant-id') h: string, @Body() b: any) { return this.doBulk(u, uid, h, b.items) }
  @Post() @Roles('admin', 'manager', 'super_admin') @ApiBearerAuth() create(@CurrentUser('tenantId') u: string, @CurrentUser('id') uid: string, @Headers('x-tenant-id') h: string, @Body() d: any) { return this.doCreate(u, uid, h, d) }
  @Put(':id') @Roles('admin', 'manager', 'super_admin') @ApiBearerAuth() update(@CurrentUser('tenantId') u: string, @Headers('x-tenant-id') h: string, @Param('id') id: string, @Body() d: any) { return this.doUpdate(u, h, id, d) }
  @Delete(':id') @Roles('admin', 'super_admin') @ApiBearerAuth() remove(@CurrentUser('tenantId') u: string, @Headers('x-tenant-id') h: string, @Param('id') id: string) { return this.doRemove(u, h, id) }
}
