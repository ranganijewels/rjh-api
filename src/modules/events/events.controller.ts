import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Headers,
  UseGuards,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { EventsService } from './events.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { Public } from '../../common/decorators/public.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'

const T = '00000000-0000-0000-0000-000000000001'
const tn = (u?: string, h?: string) => u || h || T

@ApiTags('events')
@Controller('events')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EventsController {
  constructor(private readonly svc: EventsService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'List recent domain events (outbox)' })
  list(@Headers('x-tenant-id') h: string, @Query() q: any) {
    return this.svc.list(tn(undefined, h), q)
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get a domain event by id' })
  get(@Headers('x-tenant-id') h: string, @Param('id') id: string) {
    return this.svc.get(tn(undefined, h), id)
  }

  @Post(':id/replay')
  @Roles('admin', 'manager')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Replay a domain event (reset status to pending)' })
  replay(
    @CurrentUser('tenantId') u: string,
    @Headers('x-tenant-id') h: string,
    @Param('id') id: string,
  ) {
    return this.svc.replay(tn(u, h), id)
  }

  @Delete(':id')
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a domain event' })
  remove(
    @CurrentUser('tenantId') u: string,
    @Headers('x-tenant-id') h: string,
    @Param('id') id: string,
  ) {
    return this.svc.remove(tn(u, h), id)
  }
}
