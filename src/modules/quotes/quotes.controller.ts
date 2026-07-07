import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  Headers,
  UseGuards,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { QuoteService } from './quotes.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { Public } from '../../common/decorators/public.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'

const T = '00000000-0000-0000-0000-000000000001'
const tn = (u?: string, h?: string) => u || h || T

@ApiTags('quotes')
@Controller('quotes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class QuoteController {
  constructor(private readonly svc: QuoteService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'List quotes' })
  list(@Headers('x-tenant-id') h: string, @Query() q: any) {
    return this.svc.list(tn(undefined, h), q)
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get a quote by id' })
  get(@Headers('x-tenant-id') h: string, @Param('id') id: string) {
    return this.svc.get(tn(undefined, h), id)
  }

  @Post()
  @Roles('admin', 'manager', 'super_admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a quote' })
  create(
    @CurrentUser('tenantId') u: string,
    @CurrentUser('id') uid: string,
    @Headers('x-tenant-id') h: string,
    @Body() body: any,
  ) {
    return this.svc.create(tn(u, h), body, uid)
  }

  @Put(':id')
  @Roles('admin', 'manager', 'super_admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a quote' })
  update(
    @CurrentUser('tenantId') u: string,
    @Headers('x-tenant-id') h: string,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.svc.update(tn(u, h), id, body)
  }

  @Delete(':id')
  @Roles('admin', 'super_admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a quote' })
  remove(
    @CurrentUser('tenantId') u: string,
    @Headers('x-tenant-id') h: string,
    @Param('id') id: string,
  ) {
    return this.svc.remove(tn(u, h), id)
  }

  @Post(':id/accept')
  @Roles('admin', 'manager')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Accept a quote (set status to accepted)' })
  accept(
    @CurrentUser('tenantId') u: string,
    @Headers('x-tenant-id') h: string,
    @Param('id') id: string,
  ) {
    return this.svc.accept(tn(u, h), id)
  }
}
