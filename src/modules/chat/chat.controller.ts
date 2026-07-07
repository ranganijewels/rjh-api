import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Headers,
  UseGuards,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { ChatService } from './chat.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { Public } from '../../common/decorators/public.decorator'

// ─── Storefront-facing (public visitor) chat endpoints ───────────────────
@ApiTags('storefront-chat')
@Controller('storefront/chat')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StorefrontChatController {
  constructor(private readonly service: ChatService) {}

  @Public()
  @Post('start')
  @ApiOperation({ summary: 'Start a live-chat conversation (public)' })
  start(@Headers('x-tenant-id') tenantId: string, @Body() dto: any) {
    return this.service.start(tenantId, dto || {})
  }

  @Public()
  @Post(':id/messages')
  @ApiOperation({ summary: 'Visitor sends a chat message (public)' })
  send(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    return this.service.visitorSend(tenantId, id, dto?.content || '', dto?.visitorName)
  }

  @Public()
  @Get(':id/messages')
  @ApiOperation({ summary: 'Poll for new messages (public)' })
  poll(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Query('after') after?: string,
  ) {
    return this.service.getWithMessages(tenantId, id, 'visitor', after)
  }
}

// ─── Admin-facing (agent) chat endpoints ─────────────────────────────────
@ApiTags('chat')
@ApiBearerAuth()
@Controller('chat')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ChatController {
  constructor(private readonly service: ChatService) {}

  @Get('conversations')
  @Roles('admin', 'manager', 'staff')
  @ApiOperation({ summary: 'List chat conversations (admin)' })
  list(
    @CurrentUser('tenantId') tenantId: string,
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('status') status?: string,
  ) {
    return this.service.list(tenantId || headerTenantId, status)
  }

  @Get('conversations/:id')
  @Roles('admin', 'manager', 'staff')
  @ApiOperation({ summary: 'Get a conversation with its messages (admin)' })
  get(
    @CurrentUser('tenantId') tenantId: string,
    @Headers('x-tenant-id') headerTenantId: string,
    @Param('id') id: string,
    @Query('after') after?: string,
  ) {
    return this.service.getWithMessages(tenantId || headerTenantId, id, 'admin', after)
  }

  @Post('conversations/:id/messages')
  @Roles('admin', 'manager', 'staff')
  @ApiOperation({ summary: 'Agent replies to a conversation (admin)' })
  reply(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('fullName') fullName: string,
    @Headers('x-tenant-id') headerTenantId: string,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    return this.service.agentSend(tenantId || headerTenantId, id, dto?.content || '', dto?.agentName || fullName)
  }

  @Patch('conversations/:id')
  @Roles('admin', 'manager', 'staff')
  @ApiOperation({ summary: 'Open/close a conversation (admin)' })
  setStatus(
    @CurrentUser('tenantId') tenantId: string,
    @Headers('x-tenant-id') headerTenantId: string,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    return this.service.setStatus(tenantId || headerTenantId, id, dto?.status === 'closed' ? 'closed' : 'open')
  }
}
