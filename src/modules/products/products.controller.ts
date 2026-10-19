import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  Headers,
  UseGuards,
  Version,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger'
import { SkipThrottle } from '@nestjs/throttler'
import { ProductsService } from './products.service'
import { CreateProductDto } from './dto/create-product.dto'
import { UpdateProductDto } from './dto/update-product.dto'
import { ProductFilterDto } from './dto/product-filter.dto'
import { ProductMedia } from '../../database/entities/product-media.entity'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { Public } from '../../common/decorators/public.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'

@ApiTags('Products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'List / filter products (public for storefront)' })
  findAll(
    @Headers('x-tenant-id') tenantId: string,
    @Query() dto: ProductFilterDto,
  ) {
    return this.productsService.findAll(tenantId, dto)
  }

  @Post('link-counts')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Count live products behind storefront listing links (menu validation)' })
  linkCounts(
    @Headers('x-tenant-id') tenantId: string,
    @Body() body: { links?: string[] },
  ) {
    return this.productsService.countListingLinks(tenantId, (body?.links || []).slice(0, 300))
  }

  @Get('search')
  @Public()
  @ApiOperation({ summary: 'Full-text search products via Elasticsearch' })
  @ApiQuery({ name: 'q', required: true })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  search(
    @Headers('x-tenant-id') tenantId: string,
    @Query('q') q: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.productsService.search(tenantId, q, Number(page), Number(limit))
  }

  @Get('media')
  @Public()
  @ApiOperation({ summary: 'List media records, optionally filtered by product_id' })
  listMedia(@Query('product_id') productId?: string) {
    return this.productsService.listMedia(productId)
  }

  @Get(':id/variants')
  @Public()
  @ApiOperation({ summary: 'Get all variant products (shapes/colors) of a parent product' })
  findVariants(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.productsService.findVariants(tenantId, id)
  }

  @Get('design-groups')
  @Public()
  @ApiOperation({ summary: 'List all design groups with their member products' })
  findDesignGroups(@Headers('x-tenant-id') tenantId: string) {
    return this.productsService.findDesignGroups(tenantId)
  }

  @Get('design-group/:group')
  @Public()
  @ApiOperation({ summary: 'Sibling products sharing a design (different diamond shapes)' })
  findByDesignGroup(
    @Headers('x-tenant-id') tenantId: string,
    @Param('group') group: string,
  ) {
    return this.productsService.findByDesignGroup(tenantId, group)
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get a single product by ID (public)' })
  findOne(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.productsService.findOne(tenantId, id)
  }

  @Post()
  @Roles('staff', 'manager', 'admin', 'super_admin')
  @SkipThrottle()
  @ApiOperation({ summary: 'Create a new product' })
  create(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: CreateProductDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.productsService.create(tenantId, dto, userId)
  }

  @Post('upsert')
  @Roles('staff', 'manager', 'admin', 'super_admin')
  @SkipThrottle()
  @ApiOperation({ summary: 'Create a product, or update+restore it if productCode already exists (incl. soft-deleted) — used by CSV import' })
  upsert(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: CreateProductDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.productsService.upsertByCode(tenantId, dto, userId)
  }

  @Patch(':id')
  @Roles('staff', 'manager', 'admin', 'super_admin')
  @ApiOperation({ summary: 'Update a product' })
  update(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.productsService.update(tenantId, id, dto, userId)
  }

  @Delete(':id')
  @Roles('admin', 'super_admin')
  @SkipThrottle()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete a product' })
  softDelete(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.productsService.softDelete(tenantId, id)
  }

  // ─── Flat media routes (no product :id in path) ────────────────────────────

  @Post('media')
  @Roles('staff', 'manager', 'admin', 'super_admin')
  @SkipThrottle()
  @ApiOperation({ summary: 'Create a product media record' })
  createMedia(@Body() body: Record<string, any>) {
    return this.productsService.createMedia(body)
  }

  @Post('media/bulk')
  @Roles('staff', 'manager', 'admin', 'super_admin')
  @SkipThrottle()
  @ApiOperation({ summary: 'Bulk-create product media records' })
  bulkCreateMedia(@Body() body: { items: Record<string, any>[] }) {
    return this.productsService.bulkCreateMedia(body.items ?? [])
  }

  @Delete('media/:id')
  @Roles('staff', 'manager', 'admin', 'super_admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a product media record by ID' })
  deleteMediaById(@Param('id') id: string) {
    return this.productsService.deleteMediaById(id)
  }

  @Patch('media/cover')
  @Roles('staff', 'manager', 'admin', 'super_admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set cover image for a product' })
  setCover(@Body() body: Record<string, any>) {
    const productId = body.productId ?? body.product_id
    const targetId = body.id ?? body.target_id
    const imageIds: string[] = body.imageIds ?? body.image_ids ?? []
    return this.productsService.setCover(productId, targetId, imageIds)
  }

  @Patch('media/reorder')
  @Roles('staff', 'manager', 'admin', 'super_admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reorder product media items' })
  reorderMedia(@Body() body: { items: { id: string; sort_order: number }[] }) {
    return this.productsService.reorderMedia(body.items ?? [])
  }

  @Patch('media/:id')
  @Roles('staff', 'manager', 'admin', 'super_admin')
  @ApiOperation({ summary: 'Update a product media record' })
  updateMedia(@Param('id') id: string, @Body() body: Record<string, any>) {
    return this.productsService.updateMedia(id, body)
  }

  // ─── Nested media routes ────────────────────────────────────────────────────

  @Post(':id/media')
  @Roles('staff', 'manager', 'admin', 'super_admin')
  @ApiOperation({ summary: 'Attach a media record to a product' })
  addMedia(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') productId: string,
    @Body() mediaData: Partial<ProductMedia>,
  ) {
    return this.productsService.addMedia(tenantId, productId, mediaData)
  }

  @Delete(':id/media/:mediaId')
  @Roles('staff', 'manager', 'admin', 'super_admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a media record from a product' })
  removeMedia(
    @Headers('x-tenant-id') tenantId: string,
    @Param('mediaId') mediaId: string,
  ) {
    return this.productsService.removeMedia(tenantId, mediaId)
  }
}
