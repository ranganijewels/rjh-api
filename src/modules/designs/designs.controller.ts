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
import { DesignsService } from './designs.service'
import { CreateDesignDto } from './dto/create-design.dto'
import { UpdateDesignDto } from './dto/update-design.dto'
import { DesignFilterDto } from './dto/design-filter.dto'
import { DesignMedia } from '../../database/entities/design-media.entity'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { Public } from '../../common/decorators/public.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'

@ApiTags('Designs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('designs')
export class DesignsController {
  constructor(private readonly designsService: DesignsService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'List / filter designs (public for storefront)' })
  findAll(
    @Headers('x-tenant-id') tenantId: string,
    @Query() dto: DesignFilterDto,
  ) {
    return this.designsService.findAll(tenantId, dto)
  }

  @Get('search')
  @Public()
  @ApiOperation({ summary: 'Full-text search designs via Elasticsearch' })
  @ApiQuery({ name: 'q', required: true })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  search(
    @Headers('x-tenant-id') tenantId: string,
    @Query('q') q: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.designsService.search(tenantId, q, Number(page), Number(limit))
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get a single design by ID (public)' })
  findOne(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.designsService.findOne(tenantId, id)
  }

  @Post()
  @Roles('staff', 'manager', 'admin', 'super_admin')
  @ApiOperation({ summary: 'Create a new design' })
  create(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: CreateDesignDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.designsService.create(tenantId, dto, userId)
  }

  @Patch(':id')
  @Roles('staff', 'manager', 'admin', 'super_admin')
  @ApiOperation({ summary: 'Update a design' })
  update(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateDesignDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.designsService.update(tenantId, id, dto, userId)
  }

  @Delete(':id')
  @Roles('admin', 'super_admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete a design' })
  softDelete(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.designsService.softDelete(tenantId, id)
  }

  @Post(':id/media')
  @Roles('staff', 'manager', 'admin', 'super_admin')
  @ApiOperation({ summary: 'Attach a media record to a design' })
  addMedia(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') designId: string,
    @Body() mediaData: Partial<DesignMedia>,
  ) {
    return this.designsService.addMedia(tenantId, designId, mediaData)
  }

  @Delete(':id/media/:mediaId')
  @Roles('staff', 'manager', 'admin', 'super_admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a media record from a design' })
  removeMedia(
    @Headers('x-tenant-id') tenantId: string,
    @Param('mediaId') mediaId: string,
  ) {
    return this.designsService.removeMedia(tenantId, mediaId)
  }
}
