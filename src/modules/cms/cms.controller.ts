import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { CmsService } from './cms.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { Public } from '../../common/decorators/public.decorator'
import { PaginationDto } from '../../common/dto/pagination.dto'

@ApiTags('cms')
@Controller('cms')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CmsController {
  constructor(private readonly cmsService: CmsService) {}

  // ─── Pages ────────────────────────────────────────────────────────────────

  @Public()
  @Get('pages')
  @ApiOperation({ summary: 'List all CMS pages (admin)' })
  listPages(
    @CurrentUser('tenantId') tenantId: string,
    @Headers('x-tenant-id') headerTenantId: string,
  ) {
    return this.cmsService.listPages(tenantId || headerTenantId)
  }

  @Public()
  @Get('pages/:slug')
  @ApiOperation({ summary: 'Get a published CMS page by slug (public)' })
  getPage(
    @CurrentUser('tenantId') tenantId: string,
    @Headers('x-tenant-id') headerTenantId: string,
    @Param('slug') slug: string,
  ) {
    return this.cmsService.getPage(tenantId || headerTenantId, slug)
  }

  @Put('pages/:slug')
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create or update a CMS page' })
  upsertPage(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('slug') slug: string,
    @Body() dto: Record<string, any>,
  ) {
    return this.cmsService.upsertPage(tenantId, slug, dto, userId)
  }

  @Patch('pages/:slug/status')
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Toggle page published status' })
  togglePageStatus(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('slug') slug: string,
  ) {
    return this.cmsService.togglePageStatus(tenantId, slug, userId)
  }

  // ─── Sections ─────────────────────────────────────────────────────────────

  @Public()
  @Get('sections')
  @ApiOperation({ summary: 'List sections for a page (public)' })
  getSections(
    @CurrentUser('tenantId') tenantId: string,
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('pageSlug') pageSlug: string,
  ) {
    return this.cmsService.getSections(tenantId || headerTenantId, pageSlug)
  }

  @Public()
  @Get('sections/:id')
  @ApiOperation({ summary: 'Get a single section' })
  getSection(
    @CurrentUser('tenantId') tenantId: string,
    @Headers('x-tenant-id') headerTenantId: string,
    @Param('id') id: string,
  ) {
    return this.cmsService.getSection(tenantId || headerTenantId, id)
  }

  @Post('sections')
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new section' })
  createSection(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: Record<string, any>,
  ) {
    return this.cmsService.createSection(tenantId, dto, userId)
  }

  @Put('sections/:id')
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a section' })
  updateSection(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: Record<string, any>,
  ) {
    return this.cmsService.updateSection(tenantId, id, dto, userId)
  }

  @Delete('sections/:id')
  @Roles('admin')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a section' })
  deleteSection(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.cmsService.deleteSection(tenantId, id)
  }

  @Post('sections/reorder')
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reorder sections for a page' })
  reorderSections(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: { pageSlug: string; orderedIds: string[] },
  ) {
    return this.cmsService.reorderSections(tenantId, dto.pageSlug, dto.orderedIds)
  }

  @Post('sections/seed')
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Seed default sections for a page' })
  seedSections(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: { pageSlug: string },
  ) {
    return this.cmsService.seedDefaultSections(tenantId, dto.pageSlug, userId)
  }

  // ─── Blogs ────────────────────────────────────────────────────────────────

  @Public()
  @Get('blogs')
  @ApiOperation({ summary: 'List published blogs (public)' })
  getBlogs(
    @CurrentUser('tenantId') tenantId: string,
    @Headers('x-tenant-id') headerTenantId: string,
    @Query() dto: PaginationDto,
    @Query('tag') tag?: string,
  ) {
    return this.cmsService.getBlogs(tenantId || headerTenantId, { ...dto, tag, publicOnly: true })
  }

  @Get('blogs/admin/all')
  @Roles('admin', 'staff')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all blogs including drafts (admin)' })
  getBlogsAdmin(
    @CurrentUser('tenantId') tenantId: string,
    @Query() dto: PaginationDto,
    @Query('tag') tag?: string,
  ) {
    return this.cmsService.getBlogs(tenantId, { ...dto, tag, adminMode: true })
  }

  @Get('blogs/admin/slug/:slug')
  @Roles('admin', 'staff')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a blog post by slug including drafts (admin)' })
  getBlogAdmin(
    @CurrentUser('tenantId') tenantId: string,
    @Param('slug') slug: string,
  ) {
    return this.cmsService.getBlog(tenantId, slug, false)
  }

  @Post('blogs')
  @Roles('admin', 'staff')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new blog post (slug auto-generated)' })
  createBlog(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: Record<string, any>,
  ) {
    return this.cmsService.createBlog(tenantId, dto, userId)
  }

  @Public()
  @Get('blogs/:slug')
  @ApiOperation({ summary: 'Get a published blog post by slug (public)' })
  getBlog(
    @CurrentUser('tenantId') tenantId: string,
    @Headers('x-tenant-id') headerTenantId: string,
    @Param('slug') slug: string,
  ) {
    return this.cmsService.getBlog(tenantId || headerTenantId, slug, true)
  }

  @Put('blogs/:slug')
  @Roles('admin', 'staff')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create or update a blog post' })
  upsertBlog(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('slug') slug: string,
    @Body() dto: Record<string, any>,
  ) {
    return this.cmsService.upsertBlog(tenantId, slug, dto, userId)
  }

  @Get('blogs/id/:id')
  @Roles('admin', 'staff')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a blog post by ID' })
  getBlogById(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.cmsService.getBlogById(tenantId, id)
  }

  @Patch('blogs/id/:id')
  @Roles('admin', 'staff')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a blog post by ID' })
  updateBlogById(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: Record<string, any>,
  ) {
    return this.cmsService.updateBlogById(tenantId, id, dto, userId)
  }

  @Delete('blogs/id/:id')
  @Roles('admin', 'staff')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a blog post by ID' })
  deleteBlog(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.cmsService.deleteBlog(tenantId, id)
  }

  @Patch('blogs/id/:id/status')
  @Roles('admin', 'staff')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Toggle blog post published status' })
  toggleBlogStatus(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.cmsService.toggleBlogStatus(tenantId, id)
  }

  // ─── FAQs ─────────────────────────────────────────────────────────────────

  @Public()
  @Get('faqs')
  @ApiOperation({ summary: 'List active FAQs (public)' })
  getFaqs(
    @CurrentUser('tenantId') tenantId: string,
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('category') category?: string,
  ) {
    return this.cmsService.getFaqs(tenantId || headerTenantId, category)
  }

  @Get('faqs/admin/all')
  @Roles('admin', 'staff')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all FAQs including inactive (admin)' })
  getFaqsAdmin(
    @CurrentUser('tenantId') tenantId: string,
    @Query('category') category?: string,
  ) {
    return this.cmsService.getFaqs(tenantId, category, true)
  }

  @Post('faqs')
  @Roles('admin', 'staff')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new FAQ' })
  createFaq(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: Record<string, any>,
  ) {
    return this.cmsService.upsertFaq(tenantId, dto, userId)
  }

  @Get('faqs/:id')
  @Roles('admin', 'staff')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a single FAQ by ID' })
  getFaqById(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.cmsService.getFaqById(tenantId, id)
  }

  @Put('faqs/:id')
  @Roles('admin', 'staff')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update an existing FAQ' })
  updateFaq(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: Record<string, any>,
  ) {
    return this.cmsService.upsertFaq(tenantId, dto, userId, id)
  }

  @Delete('faqs/:id')
  @Roles('admin', 'staff')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a FAQ' })
  deleteFaq(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.cmsService.deleteFaq(tenantId, id)
  }

  @Patch('faqs/:id/status')
  @Roles('admin', 'staff')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Toggle FAQ active status' })
  toggleFaqStatus(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.cmsService.toggleFaqStatus(tenantId, id)
  }

  // ─── Navigation ───────────────────────────────────────────────────────────

  @Public()
  @Get('navigation')
  @ApiOperation({ summary: 'Get navigation tree (public)' })
  getNavigation(
    @CurrentUser('tenantId') tenantId: string,
    @Headers('x-tenant-id') headerTenantId: string,
  ) {
    return this.cmsService.getNavigation(tenantId || headerTenantId)
  }

  @Post('navigation')
  @Roles('admin')
  @ApiOperation({ summary: 'Create a navigation item' })
  createNavItem(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: Record<string, any>,
  ) {
    return this.cmsService.createNavItem(tenantId, dto)
  }

  // Literal route — must be declared before the dynamic 'navigation/:id' GET
  // below, or Nest matches "admin" as an :id first.
  @Get('navigation/admin/all')
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all navigation items, flat, incl. inactive (admin)' })
  listNavigationAdmin(@CurrentUser('tenantId') tenantId: string) {
    return this.cmsService.listNavigationAdmin(tenantId)
  }

  @Post('navigation/reorder')
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reorder navigation items within a sibling group' })
  reorderNavItems(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: { parentId: string | null; orderedIds: string[] },
  ) {
    return this.cmsService.reorderNavItems(tenantId, dto.parentId ?? null, dto.orderedIds)
  }

  @Get('navigation/:id')
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a single navigation item (admin)' })
  getNavItem(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.cmsService.getNavItem(tenantId, id)
  }

  @Put('navigation/:id')
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a navigation item' })
  updateNavItem(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() dto: Record<string, any>,
  ) {
    return this.cmsService.updateNavItem(tenantId, id, dto)
  }

  @Delete('navigation/:id')
  @Roles('admin')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a navigation item (blocked if it has children)' })
  deleteNavItem(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.cmsService.deleteNavItem(tenantId, id)
  }

  // ─── Theme & Branding ─────────────────────────────────────────────────────

  @Public()
  @Get('theme')
  @ApiOperation({ summary: 'Get theme & branding settings (public)' })
  getTheme(
    @CurrentUser('tenantId') tenantId: string,
    @Headers('x-tenant-id') headerTenantId: string,
  ) {
    return this.cmsService.getTheme(tenantId || headerTenantId)
  }

  @Put('theme')
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update theme & branding settings' })
  updateTheme(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: Record<string, any>,
  ) {
    return this.cmsService.updateTheme(tenantId, dto)
  }
}
