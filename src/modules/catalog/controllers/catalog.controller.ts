import {
  Controller, Get, Post, Put, Delete, Param, Query, Body, Headers, UseGuards,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../../common/guards/roles.guard'
import { Roles } from '../../../common/decorators/roles.decorator'
import { Public } from '../../../common/decorators/public.decorator'
import { CurrentUser } from '../../../common/decorators/current-user.decorator'
import { CatalogMasterService } from '../services/catalog-master.service'
import { ProductFamilyService } from '../services/product-family.service'
import { ProductBomService } from '../services/product-bom.service'
import { ConfiguratorService } from '../services/configurator.service'

const T = '00000000-0000-0000-0000-000000000001'
const tn = (u?: string, h?: string) => u || h || T
const WRITE: any[] = ['admin', 'manager', 'super_admin']

@ApiTags('catalog')
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class CatalogController {
  constructor(
    private readonly masters: CatalogMasterService,
    private readonly families: ProductFamilyService,
    private readonly boms: ProductBomService,
    private readonly configurator: ConfiguratorService,
  ) {}

  // ─── Catalog masters (shapes/metals/purities/colors/qualities/settings) ────
  @Get('catalog-masters')
  @Public()
  @ApiOperation({ summary: 'List catalog master values (optionally by kind)' })
  listMasters(
    @Headers('x-tenant-id') h: string,
    @Query('kind') kind?: string,
    @Query('all') all?: string,
  ) {
    return this.masters.list(tn(undefined, h), kind, all === 'true' || all === '1')
  }

  @Get('catalog-masters/kinds')
  @Public()
  masterKinds(@Headers('x-tenant-id') h: string) {
    return this.masters.kinds(tn(undefined, h))
  }

  @Get('catalog-masters/:id')
  @Public()
  getMaster(@Headers('x-tenant-id') h: string, @Param('id') id: string) {
    return this.masters.get(tn(undefined, h), id)
  }

  @Post('catalog-masters/bulk')
  @Roles(...WRITE)
  @ApiBearerAuth()
  bulkMaster(
    @CurrentUser('tenantId') u: string,
    @CurrentUser('id') uid: string,
    @Headers('x-tenant-id') h: string,
    @Body() body: any,
  ) {
    return this.masters.bulkCreate(tn(u, h), body.items || body, uid)
  }

  @Post('catalog-masters')
  @Roles(...WRITE)
  @ApiBearerAuth()
  createMaster(
    @CurrentUser('tenantId') u: string,
    @CurrentUser('id') uid: string,
    @Headers('x-tenant-id') h: string,
    @Body() body: any,
  ) {
    return this.masters.create(tn(u, h), body, uid)
  }

  @Put('catalog-masters/:id')
  @Roles(...WRITE)
  @ApiBearerAuth()
  updateMaster(
    @CurrentUser('tenantId') u: string,
    @Headers('x-tenant-id') h: string,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.masters.update(tn(u, h), id, body)
  }

  @Delete('catalog-masters/:id')
  @Roles('admin', 'super_admin')
  @ApiBearerAuth()
  removeMaster(
    @CurrentUser('tenantId') u: string,
    @Headers('x-tenant-id') h: string,
    @Param('id') id: string,
  ) {
    return this.masters.remove(tn(u, h), id)
  }

  // ─── Product families ──────────────────────────────────────────────────────
  @Get('product-families')
  @Public()
  listFamilies(@Headers('x-tenant-id') h: string, @Query('status') status?: string) {
    return this.families.list(tn(undefined, h), status)
  }

  @Get('product-families/:id')
  @Public()
  getFamily(@Headers('x-tenant-id') h: string, @Param('id') id: string) {
    return this.families.get(tn(undefined, h), id)
  }

  @Post('product-families')
  @Roles(...WRITE)
  @ApiBearerAuth()
  createFamily(
    @CurrentUser('tenantId') u: string,
    @CurrentUser('id') uid: string,
    @Headers('x-tenant-id') h: string,
    @Body() body: any,
  ) {
    return this.families.create(tn(u, h), body, uid)
  }

  @Put('product-families/:id')
  @Roles(...WRITE)
  @ApiBearerAuth()
  updateFamily(
    @CurrentUser('tenantId') u: string,
    @Headers('x-tenant-id') h: string,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.families.update(tn(u, h), id, body)
  }

  @Delete('product-families/:id')
  @Roles('admin', 'super_admin')
  @ApiBearerAuth()
  removeFamily(
    @CurrentUser('tenantId') u: string,
    @Headers('x-tenant-id') h: string,
    @Param('id') id: string,
  ) {
    return this.families.remove(tn(u, h), id)
  }

  // ─── Bill of Materials ─────────────────────────────────────────────────────
  @Get('product-boms')
  @Public()
  listBoms(
    @Headers('x-tenant-id') h: string,
    @Query('familyId') familyId?: string,
    @Query('masterCode') masterCode?: string,
  ) {
    return this.boms.list(tn(undefined, h), { familyId, masterCode })
  }

  @Get('product-boms/:id')
  @Public()
  getBom(@Headers('x-tenant-id') h: string, @Param('id') id: string) {
    return this.boms.get(tn(undefined, h), id)
  }

  @Post('product-boms')
  @Roles(...WRITE)
  @ApiBearerAuth()
  createBom(
    @CurrentUser('tenantId') u: string,
    @CurrentUser('id') uid: string,
    @Headers('x-tenant-id') h: string,
    @Body() body: any,
  ) {
    return this.boms.create(tn(u, h), body, uid)
  }

  @Put('product-boms/:id')
  @Roles(...WRITE)
  @ApiBearerAuth()
  updateBom(
    @CurrentUser('tenantId') u: string,
    @Headers('x-tenant-id') h: string,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.boms.update(tn(u, h), id, body)
  }

  @Delete('product-boms/:id')
  @Roles('admin', 'super_admin')
  @ApiBearerAuth()
  removeBom(
    @CurrentUser('tenantId') u: string,
    @Headers('x-tenant-id') h: string,
    @Param('id') id: string,
  ) {
    return this.boms.remove(tn(u, h), id)
  }

  // ─── Configurator (public — resolves a variant + live price) ───────────────
  @Post(['catalog/configure', 'configurator/resolve'])
  @Public()
  @ApiOperation({ summary: 'Resolve a configured variant (weights + live price) on demand' })
  configure(@Headers('x-tenant-id') h: string, @Body() body: any) {
    return this.configurator.configure(tn(undefined, h), body || {})
  }

  @Post(['catalog/simulate', 'configurator/simulate'])
  @Public()
  @ApiOperation({ summary: 'Price simulation matrix (carat × metal × price book)' })
  simulate(@Headers('x-tenant-id') h: string, @Body() body: any) {
    return this.configurator.simulate(tn(undefined, h), body || {})
  }
}
