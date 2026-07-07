import { Controller, Get, Patch, Body, Headers } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { PricingConfigService } from './pricing-config.service'
import { Public } from '../../common/decorators/public.decorator'
import { Roles } from '../../common/decorators/roles.decorator'

@ApiTags('Pricing Config')
@ApiBearerAuth()
@Controller('pricing-config')
export class PricingConfigController {
  constructor(private readonly service: PricingConfigService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get pricing configuration (public)' })
  getConfig(@Headers('x-tenant-id') tenantId: string) {
    return this.service.getConfig(tenantId || 'default')
  }

  @Patch()
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Update pricing configuration (admin only)' })
  updateConfig(
    @Headers('x-tenant-id') tenantId: string,
    @Body() body: Record<string, any>,
  ) {
    return this.service.updateConfig(tenantId || 'default', body)
  }

  @Get('calculate')
  @Public()
  @ApiOperation({ summary: 'Calculate product price from components' })
  calculate(
    @Headers('x-tenant-id') tenantId: string,
    @Body() body: Record<string, any>,
  ) {
    return this.service.calculatePrice({ tenantId: tenantId || 'default', ...body })
  }
}
