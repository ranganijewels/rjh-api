import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Version,
} from '@nestjs/common'
import { TenantsService } from './tenants.service'
import { Roles } from '../../common/decorators/roles.decorator'

@Controller('tenants')
@Roles('super_admin')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get()
  getTenants() {
    return this.tenantsService.getTenants()
  }

  @Post()
  createTenant(
    @Body()
    dto: {
      name: string
      slug: string
      settings?: Record<string, unknown>
      adminEmail?: string
      adminPassword?: string
      adminFullName?: string
    },
  ) {
    return this.tenantsService.createTenant(dto)
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.tenantsService.findById(id)
  }

  @Patch(':id')
  updateTenant(
    @Param('id') id: string,
    @Body() dto: { name?: string; settings?: Record<string, unknown> },
  ) {
    return this.tenantsService.updateTenant(id, dto)
  }
}
