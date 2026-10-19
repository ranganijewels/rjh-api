import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  Headers,
  UseGuards,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { AfterSalesService } from './after-sales.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { Public } from '../../common/decorators/public.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'

const T = '00000000-0000-0000-0000-000000000001'
const tn = (u?: string, h?: string) => u || h || T

@ApiTags('after-sales')
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class AfterSalesController {
  constructor(private readonly svc: AfterSalesService) {}

  // ---------------------------------------------------------------------------
  // Warranties
  // ---------------------------------------------------------------------------
  @Get('warranties')
  @Public()
  @ApiOperation({ summary: 'List warranty registrations' })
  listWarranties(@Headers('x-tenant-id') h: string, @Query() q: any) {
    return this.svc.listWarranties(tn(undefined, h), q)
  }

  @Get('warranties/:id')
  @Public()
  @ApiOperation({ summary: 'Get a warranty registration' })
  getWarranty(@Headers('x-tenant-id') h: string, @Param('id') id: string) {
    return this.svc.getWarranty(tn(undefined, h), id)
  }

  @Post('warranties')
  @Roles('admin', 'manager', 'super_admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a warranty registration' })
  createWarranty(
    @CurrentUser('tenantId') u: string,
    @CurrentUser('id') uid: string,
    @Headers('x-tenant-id') h: string,
    @Body() body: any,
  ) {
    return this.svc.createWarranty(tn(u, h), body, uid)
  }

  @Put('warranties/:id')
  @Roles('admin', 'manager', 'super_admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a warranty registration' })
  updateWarranty(
    @CurrentUser('tenantId') u: string,
    @Headers('x-tenant-id') h: string,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.svc.updateWarranty(tn(u, h), id, body)
  }

  @Delete('warranties/:id')
  @Roles('admin', 'super_admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a warranty registration' })
  removeWarranty(
    @CurrentUser('tenantId') u: string,
    @Headers('x-tenant-id') h: string,
    @Param('id') id: string,
  ) {
    return this.svc.removeWarranty(tn(u, h), id)
  }

  // ---------------------------------------------------------------------------
  // Service requests
  // ---------------------------------------------------------------------------
  @Get('service-requests')
  @Public()
  @ApiOperation({ summary: 'List service requests' })
  listServiceRequests(@Headers('x-tenant-id') h: string, @Query() q: any) {
    return this.svc.listServiceRequests(tn(undefined, h), q)
  }

  @Get('service-requests/:id')
  @Public()
  @ApiOperation({ summary: 'Get a service request' })
  getServiceRequest(@Headers('x-tenant-id') h: string, @Param('id') id: string) {
    return this.svc.getServiceRequest(tn(undefined, h), id)
  }

  @Post('service-requests')
  @Public()
  @ApiOperation({ summary: 'Create a service request (public — storefront submit)' })
  createServiceRequest(
    @CurrentUser('tenantId') u: string,
    @CurrentUser('id') uid: string,
    @Headers('x-tenant-id') h: string,
    @Body() body: any,
  ) {
    return this.svc.createServiceRequest(tn(u, h), body, uid)
  }

  @Put('service-requests/:id')
  @Roles('admin', 'manager', 'super_admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a service request' })
  updateServiceRequest(
    @CurrentUser('tenantId') u: string,
    @Headers('x-tenant-id') h: string,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.svc.updateServiceRequest(tn(u, h), id, body)
  }

  @Delete('service-requests/:id')
  @Roles('admin', 'super_admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a service request' })
  removeServiceRequest(
    @CurrentUser('tenantId') u: string,
    @Headers('x-tenant-id') h: string,
    @Param('id') id: string,
  ) {
    return this.svc.removeServiceRequest(tn(u, h), id)
  }

  // ---------------------------------------------------------------------------
  // Returns / RMAs
  // ---------------------------------------------------------------------------
  @Get('returns')
  @Public()
  @ApiOperation({ summary: 'List returns / RMAs' })
  listRmas(@Headers('x-tenant-id') h: string, @Query() q: any) {
    return this.svc.listRmas(tn(undefined, h), q)
  }

  @Get('returns/:id')
  @Public()
  @ApiOperation({ summary: 'Get a return / RMA' })
  getRma(@Headers('x-tenant-id') h: string, @Param('id') id: string) {
    return this.svc.getRma(tn(undefined, h), id)
  }

  @Post('returns')
  @Public()
  @ApiOperation({ summary: 'Create a return / RMA (public — storefront submit)' })
  createRma(
    @CurrentUser('tenantId') u: string,
    @CurrentUser('id') uid: string,
    @Headers('x-tenant-id') h: string,
    @Body() body: any,
  ) {
    return this.svc.createRma(tn(u, h), body, uid)
  }

  @Put('returns/:id')
  @Roles('admin', 'manager', 'super_admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a return / RMA' })
  updateRma(
    @CurrentUser('tenantId') u: string,
    @Headers('x-tenant-id') h: string,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.svc.updateRma(tn(u, h), id, body)
  }

  @Delete('returns/:id')
  @Roles('admin', 'super_admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a return / RMA' })
  removeRma(
    @CurrentUser('tenantId') u: string,
    @Headers('x-tenant-id') h: string,
    @Param('id') id: string,
  ) {
    return this.svc.removeRma(tn(u, h), id)
  }
}
