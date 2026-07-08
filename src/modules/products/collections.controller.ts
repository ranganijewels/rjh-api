import {
  Controller, Get, Post, Patch, Put, Delete, Param, Query, Body, Headers,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { CollectionsService } from './collections.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { Public } from '../../common/decorators/public.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'

@ApiTags('Collections')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('collections')
export class CollectionsController {
  constructor(private readonly collections: CollectionsService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'List collections (public for storefront nav/CMS pickers)' })
  list(
    @Headers('x-tenant-id') tenantId: string,
    @Query('all') all?: string,
  ) {
    return this.collections.list(tenantId, all === 'true' || all === '1')
  }

  @Get('slug/:slug')
  @Public()
  @ApiOperation({ summary: 'Resolve a collection page by slug with its active products' })
  bySlug(
    @Headers('x-tenant-id') tenantId: string,
    @Param('slug') slug: string,
  ) {
    return this.collections.getBySlug(tenantId, slug)
  }

  @Get(':id')
  @Roles('staff', 'manager', 'admin', 'super_admin')
  @ApiOperation({ summary: 'Get a collection with all member products (admin)' })
  get(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.collections.getWithProducts(tenantId, id)
  }

  @Post()
  @Roles('manager', 'admin', 'super_admin')
  @ApiOperation({ summary: 'Create a collection' })
  create(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: Record<string, any>,
    @CurrentUser('id') userId: string,
  ) {
    return this.collections.create(tenantId, dto, userId)
  }

  @Patch(':id')
  @Roles('manager', 'admin', 'super_admin')
  @ApiOperation({ summary: 'Update a collection' })
  update(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body() dto: Record<string, any>,
  ) {
    return this.collections.update(tenantId, id, dto)
  }

  @Put(':id/products')
  @Roles('manager', 'admin', 'super_admin')
  @ApiOperation({ summary: 'Replace the products assigned to a collection' })
  assign(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body() body: { productIds: string[] },
  ) {
    return this.collections.assignProducts(tenantId, id, body?.productIds || [])
  }

  @Delete(':id')
  @Roles('admin', 'super_admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a collection (products are detached, not deleted)' })
  remove(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.collections.remove(tenantId, id)
  }
}
