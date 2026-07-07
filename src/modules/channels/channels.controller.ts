import { Controller, Get, Post, Patch, Param, Query, Body, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { ChannelsService } from './channels.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { PaginationDto } from '../../common/dto/pagination.dto'

@ApiTags('channels')
@ApiBearerAuth()
@Controller('channels')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('staff')
export class ChannelsController {
  constructor(private readonly channelsService: ChannelsService) {}

  @Get('listings')
  @ApiOperation({ summary: 'Get multi-channel product listings' })
  getListings(
    @CurrentUser('tenantId') tenantId: string,
    @Query() dto: PaginationDto,
  ) {
    return this.channelsService.getListings(tenantId, dto)
  }

  @Post('listings')
  @ApiOperation({ summary: 'Create a channel listing' })
  createListing(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: Record<string, any>,
  ) {
    return this.channelsService.createListing(tenantId, dto, userId)
  }

  @Patch('listings/:id/status')
  @ApiOperation({ summary: 'Update listing status' })
  updateListingStatus(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() body: { status: string },
  ) {
    return this.channelsService.updateListingStatus(tenantId, id, body.status)
  }

  @Get('export-logs')
  @ApiOperation({ summary: 'Get channel export logs' })
  getExportLogs(
    @CurrentUser('tenantId') tenantId: string,
    @Query() dto: PaginationDto,
  ) {
    return this.channelsService.getExportLogs(tenantId, dto)
  }
}
