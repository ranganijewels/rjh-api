import { Controller, Get, Param, Query } from '@nestjs/common'
import { AuditService } from './audit.service'
import { PaginationDto } from '../../common/dto/pagination.dto'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { User } from '../../database/entities/user.entity'

@Controller('audit')
@Roles('admin', 'super_admin')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  getLogs(
    @CurrentUser() user: User,
    @Query()
    dto: PaginationDto & {
      entityType?: string
      entityId?: string
      userId?: string
      action?: string
    },
  ) {
    return this.auditService.getLogs(user.tenantId, dto)
  }

  @Get(':entityType/:entityId')
  getEntityHistory(
    @CurrentUser() user: User,
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    return this.auditService.getEntityHistory(user.tenantId, entityType, entityId)
  }
}
