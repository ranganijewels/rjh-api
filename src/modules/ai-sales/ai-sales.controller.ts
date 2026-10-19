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
import { AiSalesService } from './ai-sales.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { PaginationDto } from '../../common/dto/pagination.dto'
import { AiLeadStatus, AiLeadTemperature } from '../../database/entities/ai-sales-lead.entity'
import { AiAgentName } from '../../database/entities/ai-sales-agent-settings.entity'

@ApiTags('ai-sales')
@ApiBearerAuth()
@Controller('ai-sales')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AiSalesController {
  constructor(private readonly aiSalesService: AiSalesService) {}

  // ─── Leads ────────────────────────────────────────────────────────────────

  @Get('leads')
  @Roles('staff')
  @ApiOperation({ summary: 'List AI sales leads' })
  getLeads(
    @CurrentUser('tenantId') tenantId: string,
    @Query() dto: PaginationDto,
    @Query('status') status?: AiLeadStatus,
    @Query('temperature') temperature?: AiLeadTemperature,
  ) {
    return this.aiSalesService.getLeads(tenantId, { ...dto, status, temperature })
  }

  @Post('leads')
  @Roles('staff')
  @ApiOperation({ summary: 'Create a new AI sales lead' })
  createLead(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: Record<string, any>,
  ) {
    return this.aiSalesService.createLead(tenantId, dto)
  }

  @Get('leads/:id')
  @Roles('staff')
  @ApiOperation({ summary: 'Get a single AI sales lead with messages' })
  getLead(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.aiSalesService.getLead(tenantId, id)
  }

  @Post('leads/:id/message')
  @Roles('staff')
  @ApiOperation({ summary: 'Send a message to the AI agent for a lead' })
  processMessage(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('id') leadId: string,
    @Body() body: { message: string },
  ) {
    return this.aiSalesService.processMessage(tenantId, leadId, body.message, userId)
  }

  // ─── Settings ─────────────────────────────────────────────────────────────

  @Get('settings')
  @Roles('admin')
  @ApiOperation({ summary: 'Get all AI agent settings' })
  getAgentSettings(@CurrentUser('tenantId') tenantId: string) {
    return this.aiSalesService.getAgentSettings(tenantId)
  }

  @Patch('settings/:agentName')
  @Roles('admin')
  @ApiOperation({ summary: 'Update settings for a specific AI agent' })
  updateAgentSettings(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('agentName') agentName: AiAgentName,
    @Body() dto: Record<string, any>,
  ) {
    return this.aiSalesService.updateAgentSettings(tenantId, agentName, dto, userId)
  }
}
