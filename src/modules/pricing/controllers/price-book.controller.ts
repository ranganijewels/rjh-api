import {
  Controller, Get, Post, Put, Delete, Param, Query, Body, Headers, UseGuards,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../../common/guards/roles.guard'
import { Roles } from '../../../common/decorators/roles.decorator'
import { Public } from '../../../common/decorators/public.decorator'
import { CurrentUser } from '../../../common/decorators/current-user.decorator'
import { PriceBookService } from '../services/price-book.service'
import { PricingEngineService } from '../services/pricing-engine.service'

const T = '00000000-0000-0000-0000-000000000001'
const tn = (u?: string, h?: string) => u || h || T
const WRITE: any[] = ['admin', 'manager', 'super_admin']

@ApiTags('pricing-masters')
@Controller('price-books')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PriceBookController {
  constructor(
    private readonly svc: PriceBookService,
    private readonly engine: PricingEngineService,
  ) {}

  @Get()
  @Public()
  list(@Headers('x-tenant-id') h: string, @Query('all') all?: string) {
    return this.svc.list(tn(undefined, h), all === 'true' || all === '1')
  }

  @Get(':id')
  @Public()
  get(@Headers('x-tenant-id') h: string, @Param('id') id: string) {
    return this.svc.get(tn(undefined, h), id)
  }

  @Post('bulk')
  @Roles(...WRITE)
  @ApiBearerAuth()
  async bulk(
    @CurrentUser('tenantId') u: string,
    @CurrentUser('id') uid: string,
    @Headers('x-tenant-id') h: string,
    @Body() body: any,
  ) {
    const r = await this.svc.bulkCreate(tn(u, h), body.items || body, uid)
    this.engine.invalidateCache()
    return r
  }

  @Post('bulk-delete')
  @Roles('admin', 'super_admin')
  @ApiBearerAuth()
  async bulkDelete(
    @CurrentUser('tenantId') u: string,
    @Headers('x-tenant-id') h: string,
    @Body() body: any,
  ) {
    const r = await this.svc.bulkRemove(tn(u, h), body.ids)
    this.engine.invalidateCache()
    return r
  }

  @Post()
  @Roles(...WRITE)
  @ApiBearerAuth()
  async create(
    @CurrentUser('tenantId') u: string,
    @CurrentUser('id') uid: string,
    @Headers('x-tenant-id') h: string,
    @Body() body: any,
  ) {
    const r = await this.svc.create(tn(u, h), body, uid)
    this.engine.invalidateCache()
    return r
  }

  @Put(':id')
  @Roles(...WRITE)
  @ApiBearerAuth()
  async update(
    @CurrentUser('tenantId') u: string,
    @Headers('x-tenant-id') h: string,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    const r = await this.svc.update(tn(u, h), id, body)
    this.engine.invalidateCache()
    return r
  }

  @Delete(':id')
  @Roles('admin', 'super_admin')
  @ApiBearerAuth()
  async remove(
    @CurrentUser('tenantId') u: string,
    @Headers('x-tenant-id') h: string,
    @Param('id') id: string,
  ) {
    const r = await this.svc.remove(tn(u, h), id)
    this.engine.invalidateCache()
    return r
  }
}
