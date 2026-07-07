import {
  Controller, Get, Post, Put, Delete, Param, Query, Body, Headers, UseGuards,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { AccountsService } from './accounts.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { Public } from '../../common/decorators/public.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'

const T = '00000000-0000-0000-0000-000000000001'
const tn = (u?: string, h?: string) => u || h || T

@ApiTags('Accounts')
@Controller('accounts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AccountsController {
  constructor(private readonly svc: AccountsService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'List accounts' })
  list(@Headers('x-tenant-id') h: string, @Query() q: any) {
    return this.svc.list(tn(undefined, h), q)
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get account by id' })
  get(@Headers('x-tenant-id') h: string, @Param('id') id: string) {
    return this.svc.get(tn(undefined, h), id)
  }

  @Post()
  @Roles('admin', 'manager', 'super_admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create account' })
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
  @ApiOperation({ summary: 'Update account' })
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
  @ApiOperation({ summary: 'Delete account' })
  remove(
    @CurrentUser('tenantId') u: string,
    @Headers('x-tenant-id') h: string,
    @Param('id') id: string,
  ) {
    return this.svc.remove(tn(u, h), id)
  }
}
