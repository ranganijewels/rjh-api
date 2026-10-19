import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Version,
} from '@nestjs/common'
import { DiamondsService } from './diamonds.service'
import { PaginationDto } from '../../common/dto/pagination.dto'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { User } from '../../database/entities/user.entity'

@Controller('diamonds')
export class DiamondsController {
  constructor(private readonly diamondsService: DiamondsService) {}

  @Get()
  @Roles('staff', 'manager', 'admin', 'super_admin')
  getDiamonds(
    @CurrentUser() user: User,
    @Query()
    dto: PaginationDto & {
      shape?: string
      color?: string
      clarity?: string
      minCarat?: number
      maxCarat?: number
      status?: string
      lab?: string
    },
  ) {
    return this.diamondsService.getDiamonds(user.tenantId, dto)
  }

  @Post()
  @Roles('staff', 'manager', 'admin', 'super_admin')
  createDiamond(
    @CurrentUser() user: User,
    @Body() dto: Record<string, unknown>,
  ) {
    return this.diamondsService.createDiamond(user.tenantId, dto, user.id)
  }

  @Get('holdings')
  @Roles('staff', 'manager', 'admin', 'super_admin')
  getDiamondHoldings(@CurrentUser() user: User) {
    return this.diamondsService.getDiamondHoldings(user.tenantId)
  }

  @Get('pair-matching')
  @Roles('staff', 'manager', 'admin', 'super_admin')
  matchPairs(
    @CurrentUser() user: User,
    @Query()
    params: {
      color?: string
      clarity?: string
      carat?: number
      tolerance?: number
    },
  ) {
    return this.diamondsService.matchPairs(user.tenantId, params)
  }

  @Get('parcels')
  @Roles('staff', 'manager', 'admin', 'super_admin')
  getParcels(@CurrentUser() user: User, @Query() dto: PaginationDto) {
    return this.diamondsService.getParcels(user.tenantId, dto)
  }

  @Post('parcels')
  @Roles('staff', 'manager', 'admin', 'super_admin')
  createParcel(
    @CurrentUser() user: User,
    @Body() dto: Record<string, unknown>,
  ) {
    return this.diamondsService.createParcel(user.tenantId, dto, user.id)
  }

  @Get('parcels/:id')
  @Roles('staff', 'manager', 'admin', 'super_admin')
  getParcel(@CurrentUser() user: User, @Param('id') id: string) {
    return this.diamondsService.getParcel(user.tenantId, id)
  }

  @Patch('parcels/:id')
  @Roles('manager', 'admin', 'super_admin')
  updateParcel(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: Record<string, unknown>,
  ) {
    return this.diamondsService.updateParcel(user.tenantId, id, dto, user.id)
  }

  @Get(':id')
  @Roles('staff', 'manager', 'admin', 'super_admin')
  getDiamond(@CurrentUser() user: User, @Param('id') id: string) {
    return this.diamondsService.getDiamond(user.tenantId, id)
  }

  @Patch(':id')
  @Roles('staff', 'manager', 'admin', 'super_admin')
  updateDiamond(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: Record<string, unknown>,
  ) {
    return this.diamondsService.updateDiamond(user.tenantId, id, dto, user.id)
  }

  @Patch(':id/status')
  @Roles('manager', 'admin', 'super_admin')
  updateStatus(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.diamondsService.updateStatus(user.tenantId, id, status, user.id)
  }
}
