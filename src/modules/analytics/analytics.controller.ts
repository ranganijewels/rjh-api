import { Controller, Get, Headers } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { AnalyticsService } from './analytics.service'
import { Public } from '../../common/decorators/public.decorator'

const DEFAULT_TENANT = '00000000-0000-0000-0000-000000000001'

@ApiTags('analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @Public()
  @ApiOperation({ summary: 'Live command-center dashboard metrics for the admin' })
  getDashboard(@Headers('x-tenant-id') tenantId: string) {
    return this.analyticsService.getDashboard(tenantId || DEFAULT_TENANT)
  }
}
