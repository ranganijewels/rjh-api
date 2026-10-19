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
import { PimService } from './pim.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { Public } from '../../common/decorators/public.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'

const T = '00000000-0000-0000-0000-000000000001'
const tn = (u?: string, h?: string) => u || h || T

@ApiTags('pim')
@Controller('pim')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PimController {
  constructor(private readonly svc: PimService) {}

  // ─── Attribute definitions ──────────────────────────────────────────────────

  @Get('attributes')
  @Public()
  @ApiOperation({ summary: 'List attribute definitions (optionally by group)' })
  listAttributes(@Headers('x-tenant-id') h: string, @Query('groupName') groupName: string) {
    return this.svc.listDefinitions(tn(undefined, h), groupName)
  }

  @Post('attributes')
  @Roles('admin', 'manager', 'super_admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create an attribute definition' })
  createAttribute(
    @CurrentUser('tenantId') u: string,
    @CurrentUser('id') uid: string,
    @Headers('x-tenant-id') h: string,
    @Body() body: any,
  ) {
    return this.svc.createDefinition(tn(u, h), body, uid)
  }

  @Put('attributes/:id')
  @Roles('admin', 'manager', 'super_admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update an attribute definition' })
  updateAttribute(
    @CurrentUser('tenantId') u: string,
    @Headers('x-tenant-id') h: string,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.svc.updateDefinition(tn(u, h), id, body)
  }

  @Delete('attributes/:id')
  @Roles('admin', 'super_admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete an attribute definition' })
  removeAttribute(
    @CurrentUser('tenantId') u: string,
    @Headers('x-tenant-id') h: string,
    @Param('id') id: string,
  ) {
    return this.svc.removeDefinition(tn(u, h), id)
  }

  // ─── Per-product attribute values ───────────────────────────────────────────

  @Get('products/:productId/attributes')
  @Public()
  @ApiOperation({ summary: 'Get a product’s attribute values' })
  getProductAttributes(
    @Headers('x-tenant-id') h: string,
    @Param('productId') productId: string,
  ) {
    return this.svc.getValues(tn(undefined, h), productId)
  }

  @Post('products/:productId/attributes')
  @Roles('admin', 'manager', 'super_admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Set (upsert) a product attribute value' })
  setProductAttribute(
    @CurrentUser('tenantId') u: string,
    @CurrentUser('id') uid: string,
    @Headers('x-tenant-id') h: string,
    @Param('productId') productId: string,
    @Body() body: any,
  ) {
    return this.svc.setValue(
      tn(u, h),
      {
        productId,
        attributeId: body?.attributeId,
        value: body?.value,
        locale: body?.locale,
      },
      uid,
    )
  }

  // ─── Completeness ───────────────────────────────────────────────────────────

  @Get('products/:productId/completeness')
  @Public()
  @ApiOperation({ summary: 'Product attribute completeness score' })
  completeness(
    @Headers('x-tenant-id') h: string,
    @Param('productId') productId: string,
  ) {
    return this.svc.completeness(tn(undefined, h), productId)
  }
}
