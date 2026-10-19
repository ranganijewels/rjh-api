import {
  Controller, Get, Post, Delete, Param, Query, Body, Headers, UseGuards,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { DamService } from './dam.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { Public } from '../../common/decorators/public.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'

const T = '00000000-0000-0000-0000-000000000001'
const tn = (u?: string, h?: string) => u || h || T

@ApiTags('DAM')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dam')
export class DamController {
  constructor(private readonly svc: DamService) {}

  // ─── Assets ───────────────────────────────────────────────────────────────
  @Get('assets')
  @Public()
  @ApiOperation({ summary: 'List DAM assets' })
  listAssets(@Headers('x-tenant-id') h: string, @Query() q: any) {
    return this.svc.listAssets(tn(undefined, h), q)
  }

  @Post('assets')
  @Roles('admin', 'manager', 'super_admin')
  @ApiOperation({ summary: 'Create a DAM asset' })
  createAsset(
    @CurrentUser('tenantId') u: string,
    @CurrentUser('id') uid: string,
    @Headers('x-tenant-id') h: string,
    @Body() body: any,
  ) {
    return this.svc.createAsset(tn(u, h), body, uid)
  }

  @Delete('assets/:id')
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Delete a DAM asset' })
  removeAsset(
    @CurrentUser('tenantId') u: string,
    @Headers('x-tenant-id') h: string,
    @Param('id') id: string,
  ) {
    return this.svc.removeAsset(tn(u, h), id)
  }

  // ─── Ingest ─────────────────────────────────────────────────────────────────
  @Post('ingest')
  @Roles('admin', 'manager', 'super_admin')
  @ApiOperation({ summary: 'Ingest files (parse names + create assets & bindings)' })
  ingest(
    @CurrentUser('tenantId') u: string,
    @CurrentUser('id') uid: string,
    @Headers('x-tenant-id') h: string,
    @Body() body: any,
  ) {
    const items = Array.isArray(body?.items) ? body.items : []
    return this.svc.ingest(tn(u, h), items, uid)
  }

  // ─── Bindings ───────────────────────────────────────────────────────────────
  @Get('bindings')
  @Public()
  @ApiOperation({ summary: 'List asset bindings (filter by refId / productId)' })
  listBindings(@Headers('x-tenant-id') h: string, @Query() q: any) {
    return this.svc.listBindings(tn(undefined, h), q)
  }

  // ─── Parse preview ───────────────────────────────────────────────────────────
  @Post('parse')
  @Public()
  @ApiOperation({ summary: 'Parse a filename into tokens (preview helper)' })
  parse(@Body() body: any) {
    return this.svc.parseFileName(body?.fileName || '')
  }
}
