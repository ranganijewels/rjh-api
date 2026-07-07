import {
  Controller, Get, Post, Put, Delete, Param, Query, Body, Headers, UseGuards,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { SeoService } from './seo.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { Public } from '../../common/decorators/public.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'

const T = '00000000-0000-0000-0000-000000000001'
const tn = (u?: string, h?: string) => u || h || T

@ApiTags('seo')
@Controller('seo')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SeoController {
  constructor(private readonly svc: SeoService) {}

  // ─── Pages ──────────────────────────────────────────────────────────────────

  @Get('pages')
  @Public()
  @ApiOperation({ summary: 'List SEO pages (public)' })
  listPages(@Headers('x-tenant-id') h: string, @Query() q: any) {
    return this.svc.list(tn(undefined, h), q)
  }

  @Get('pages/:id')
  @Public()
  @ApiOperation({ summary: 'Get an SEO page (public)' })
  getPage(@Headers('x-tenant-id') h: string, @Param('id') id: string) {
    return this.svc.get(tn(undefined, h), id)
  }

  @Post('pages')
  @Roles('admin', 'manager', 'super_admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create an SEO page (admin)' })
  createPage(
    @CurrentUser('tenantId') u: string,
    @CurrentUser('id') uid: string,
    @Headers('x-tenant-id') h: string,
    @Body() body: any,
  ) {
    return this.svc.create(tn(u, h), body, uid)
  }

  @Put('pages/:id')
  @Roles('admin', 'manager', 'super_admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update an SEO page (admin)' })
  updatePage(
    @CurrentUser('tenantId') u: string,
    @Headers('x-tenant-id') h: string,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.svc.update(tn(u, h), id, body)
  }

  @Delete('pages/:id')
  @Roles('admin', 'super_admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete an SEO page (admin)' })
  removePage(
    @CurrentUser('tenantId') u: string,
    @Headers('x-tenant-id') h: string,
    @Param('id') id: string,
  ) {
    return this.svc.remove(tn(u, h), id)
  }

  // ─── Resolution / generation / schema / sitemap ─────────────────────────────

  @Get('resolve')
  @Public()
  @ApiOperation({ summary: 'Resolve a slug → page or redirect (public)' })
  resolve(@Headers('x-tenant-id') h: string, @Query('slug') slug: string) {
    return this.svc.resolveSlug(tn(undefined, h), slug)
  }

  @Post('generate-facets')
  @Roles('admin', 'manager', 'super_admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate programmatic facet landing pages (admin)' })
  generateFacets(
    @CurrentUser('tenantId') u: string,
    @Headers('x-tenant-id') h: string,
    @Body() body: any,
  ) {
    return this.svc.generateFacetPages(tn(u, h), body?.base)
  }

  @Get('schema/product/:productId')
  @Public()
  @ApiOperation({ summary: 'schema.org Product+Offer JSON-LD for a product (public)' })
  schemaForProduct(
    @Headers('x-tenant-id') h: string,
    @Param('productId') productId: string,
  ) {
    return this.svc.schemaForProduct(tn(undefined, h), productId)
  }

  @Get('sitemap')
  @Public()
  @ApiOperation({ summary: 'Sitemap entries for indexable published pages (public)' })
  sitemap(@Headers('x-tenant-id') h: string) {
    return this.svc.sitemap(tn(undefined, h))
  }

  // ─── Redirects ──────────────────────────────────────────────────────────────

  @Get('redirects')
  @Public()
  @ApiOperation({ summary: 'List redirects (public)' })
  listRedirects(@Headers('x-tenant-id') h: string) {
    return this.svc.listRedirects(tn(undefined, h))
  }

  @Post('redirects')
  @Roles('admin', 'manager', 'super_admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a redirect (admin)' })
  createRedirect(
    @CurrentUser('tenantId') u: string,
    @CurrentUser('id') uid: string,
    @Headers('x-tenant-id') h: string,
    @Body() body: any,
  ) {
    return this.svc.createRedirect(tn(u, h), body, uid)
  }

  @Delete('redirects/:id')
  @Roles('admin', 'super_admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a redirect (admin)' })
  removeRedirect(
    @CurrentUser('tenantId') u: string,
    @Headers('x-tenant-id') h: string,
    @Param('id') id: string,
  ) {
    return this.svc.removeRedirect(tn(u, h), id)
  }
}
