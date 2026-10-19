import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Version,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { SalesService } from './sales.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { PaginationDto } from '../../common/dto/pagination.dto'
import { SalesLeadStage } from '../../database/entities/sales-lead.entity'
import { FollowUpStatus } from '../../database/entities/sales-follow-up.entity'

@ApiTags('sales')
@ApiBearerAuth()
@Controller('sales')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('staff')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  // ─── Leads ────────────────────────────────────────────────────────────────

  @Get('leads')
  @ApiOperation({ summary: 'List sales leads (paginated)' })
  getLeads(
    @CurrentUser('tenantId') tenantId: string,
    @Query() dto: PaginationDto,
    @Query('stage') stage?: SalesLeadStage,
  ) {
    return this.salesService.getLeads(tenantId, { ...dto, stage })
  }

  @Post('leads')
  @ApiOperation({ summary: 'Create a new sales lead' })
  createLead(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: Record<string, any>,
  ) {
    return this.salesService.createLead(tenantId, dto, userId)
  }

  @Get('leads/:id')
  @ApiOperation({ summary: 'Get a single lead by ID' })
  getLead(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.salesService.getLead(tenantId, id)
  }

  @Patch('leads/:id')
  @ApiOperation({ summary: 'Update a lead' })
  updateLead(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: Record<string, any>,
  ) {
    return this.salesService.updateLead(tenantId, id, dto, userId)
  }

  // ─── Follow-Ups ───────────────────────────────────────────────────────────

  @Get('follow-ups/upcoming')
  @ApiOperation({ summary: 'Get follow-ups due in the next 24 hours' })
  getUpcomingFollowUps(@CurrentUser('tenantId') tenantId: string) {
    return this.salesService.getUpcomingFollowUps(tenantId)
  }

  @Get('follow-ups')
  @ApiOperation({ summary: 'List follow-ups (paginated, filterable)' })
  getFollowUps(
    @CurrentUser('tenantId') tenantId: string,
    @Query() dto: PaginationDto,
    @Query('status') status?: FollowUpStatus,
    @Query('scheduledFrom') scheduledFrom?: string,
    @Query('scheduledTo') scheduledTo?: string,
  ) {
    return this.salesService.getFollowUps(tenantId, { ...dto, status, scheduledFrom, scheduledTo })
  }

  @Post('follow-ups')
  @ApiOperation({ summary: 'Create a follow-up' })
  createFollowUp(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: Record<string, any>,
  ) {
    return this.salesService.createFollowUp(tenantId, dto, userId)
  }

  @Patch('follow-ups/:id/complete')
  @ApiOperation({ summary: 'Mark a follow-up as complete' })
  completeFollowUp(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() body: { outcome: string; nextFollowUpAt?: Date },
  ) {
    return this.salesService.completeFollowUp(
      tenantId,
      id,
      body.outcome,
      body.nextFollowUpAt || null,
      userId,
    )
  }

  // ─── Message Templates ────────────────────────────────────────────────────

  @Get('templates')
  @ApiOperation({ summary: 'Get message templates for sales follow-ups' })
  getTemplates(@CurrentUser('tenantId') tenantId: string) {
    return this.salesService.getTemplates(tenantId)
  }

  @Post('templates')
  @ApiOperation({ summary: 'Create a message template' })
  createTemplate(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: Record<string, any>,
  ) {
    return this.salesService.createTemplate(tenantId, dto, userId)
  }
}
