import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Version,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { MastersService } from './masters.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'

@ApiTags('masters')
@ApiBearerAuth()
@Controller('masters')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MastersController {
  constructor(private readonly mastersService: MastersService) {}

  // ─── Categories ───────────────────────────────────────────────────────────

  @Get('categories')
  @Roles('staff')
  @ApiOperation({ summary: 'List all master categories with value counts' })
  getCategories(@CurrentUser('tenantId') tenantId: string) {
    return this.mastersService.getCategories(tenantId)
  }

  @Post('categories')
  @Roles('admin')
  @ApiOperation({ summary: 'Create a master category' })
  createCategory(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: Record<string, any>,
  ) {
    return this.mastersService.createCategory(tenantId, dto, userId)
  }

  @Patch('categories/:id')
  @Roles('admin')
  @ApiOperation({ summary: 'Update a master category' })
  updateCategory(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: Record<string, any>,
  ) {
    return this.mastersService.updateCategory(tenantId, id, dto, userId)
  }

  // ─── Values ───────────────────────────────────────────────────────────────

  @Get('values')
  @Roles('staff')
  @ApiOperation({ summary: 'List master values, optionally filtered by category' })
  getValues(
    @CurrentUser('tenantId') tenantId: string,
    @Query('categoryId') categoryId?: string,
    @Query('categoryKey') categoryKey?: string,
    // Several admin screens call this with `?category=<key>` instead of
    // `categoryKey` — accepted as an alias so those callers actually filter.
    @Query('category') category?: string,
  ) {
    return this.mastersService.getValues(tenantId, categoryId, categoryKey || category)
  }

  @Post('values')
  @Roles('manager')
  @ApiOperation({ summary: 'Create a master value' })
  createValue(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: Record<string, any>,
  ) {
    return this.mastersService.createValue(tenantId, dto, userId)
  }

  @Patch('values/:id')
  @Roles('manager')
  @ApiOperation({ summary: 'Update a master value' })
  updateValue(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: Record<string, any>,
  ) {
    return this.mastersService.updateValue(tenantId, id, dto, userId)
  }

  @Delete('values/:id')
  @Roles('admin')
  @ApiOperation({ summary: 'Hard-delete a master value (only if non-system)' })
  deleteValue(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.mastersService.deleteValue(tenantId, id)
  }
}
