import {
  Controller,
  Get,
  Query,
  UseGuards,
  Version,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { ReportsService } from './reports.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'

@ApiTags('reports')
@ApiBearerAuth()
@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('manager')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('inventory-summary')
  @ApiOperation({ summary: 'Inventory summary by status and location' })
  getInventorySummary(@CurrentUser('tenantId') tenantId: string) {
    return this.reportsService.getInventorySummary(tenantId)
  }

  @Get('sales-summary')
  @ApiOperation({ summary: 'Sales summary for a date range grouped by status' })
  getSalesSummary(
    @CurrentUser('tenantId') tenantId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    const fromDate = from ? new Date(from) : new Date(new Date().setDate(1))
    const toDate = to ? new Date(to) : new Date()
    return this.reportsService.getSalesSummary(tenantId, fromDate, toDate)
  }

  @Get('procurement-aging')
  @ApiOperation({ summary: 'Outstanding procurement POs grouped by age buckets' })
  getProcurementAging(@CurrentUser('tenantId') tenantId: string) {
    return this.reportsService.getProcurementAging(tenantId)
  }

  @Get('job-card-status')
  @ApiOperation({ summary: 'Job card count by production status' })
  getJobCardStatus(@CurrentUser('tenantId') tenantId: string) {
    return this.reportsService.getJobCardStatus(tenantId)
  }
}
