import {
  Controller, Get, Post, Param, Query, Body, Headers, UseGuards,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { MesService } from './mes.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { Public } from '../../common/decorators/public.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'

const T = '00000000-0000-0000-0000-000000000001'
const tn = (u?: string, h?: string) => u || h || T

@ApiTags('mes')
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class MesController {
  constructor(private readonly svc: MesService) {}

  // ─── Work Centers ────────────────────────────────────────────────────────────

  @Get('work-centers')
  @Public()
  @ApiOperation({ summary: 'List work centers' })
  listWorkCenters(@Headers('x-tenant-id') h: string) {
    return this.svc.listWorkCenters(tn(undefined, h))
  }

  @Post('work-centers')
  @Roles('admin', 'manager', 'super_admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a work center' })
  createWorkCenter(
    @CurrentUser('tenantId') u: string,
    @CurrentUser('id') uid: string,
    @Headers('x-tenant-id') h: string,
    @Body() body: any,
  ) {
    return this.svc.createWorkCenter(tn(u, h), body, uid)
  }

  // ─── Production Orders ─────────────────────────────────────────────────────────

  @Get('production-orders')
  @Public()
  @ApiOperation({ summary: 'List production orders' })
  listOrders(@Headers('x-tenant-id') h: string, @Query() q: any) {
    return this.svc.listOrders(tn(undefined, h), q)
  }

  @Get('production-orders/:id')
  @Public()
  @ApiOperation({ summary: 'Get a production order with its steps' })
  getOrder(@Headers('x-tenant-id') h: string, @Param('id') id: string) {
    return this.svc.getOrder(tn(undefined, h), id)
  }

  @Post('production-orders')
  @Roles('admin', 'manager', 'super_admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a production order and generate routing' })
  createOrder(
    @CurrentUser('tenantId') u: string,
    @CurrentUser('id') uid: string,
    @Headers('x-tenant-id') h: string,
    @Body() body: any,
  ) {
    return this.svc.createProductionOrder(tn(u, h), body, uid)
  }

  @Post('production-orders/:id/advance')
  @Roles('admin', 'manager', 'super_admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Advance the current job step' })
  advance(
    @CurrentUser('tenantId') u: string,
    @Headers('x-tenant-id') h: string,
    @Param('id') id: string,
  ) {
    return this.svc.advanceStep(tn(u, h), id)
  }

  @Get('production-orders/:id/steps')
  @Public()
  @ApiOperation({ summary: 'List job steps for a production order' })
  listSteps(@Headers('x-tenant-id') h: string, @Param('id') id: string) {
    return this.svc.listSteps(tn(undefined, h), id)
  }
}
