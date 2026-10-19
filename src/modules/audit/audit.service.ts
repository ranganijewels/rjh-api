import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { AuditLog } from '../../database/entities/audit-log.entity'
import { PaginationDto } from '../../common/dto/pagination.dto'

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  async log(data: {
    tenantId: string
    userId?: string
    userEmail?: string
    userRole?: string
    action: string
    entityType: string
    entityId?: string
    oldData?: Record<string, unknown>
    newData?: Record<string, unknown>
    ipAddress?: string
    userAgent?: string
    notes?: string
  }): Promise<AuditLog> {
    const entry = this.auditLogRepository.create(data)
    return this.auditLogRepository.save(entry)
  }

  async getLogs(
    tenantId: string,
    dto: PaginationDto & {
      entityType?: string
      entityId?: string
      userId?: string
      action?: string
    },
  ): Promise<{ data: AuditLog[]; total: number; page: number; limit: number }> {
    const { page = 1, limit = 20, entityType, entityId, userId, action } = dto
    const skip = (page - 1) * limit

    const qb = this.auditLogRepository
      .createQueryBuilder('log')
      .where('log.tenantId = :tenantId', { tenantId })

    if (entityType) qb.andWhere('log.entityType = :entityType', { entityType })
    if (entityId) qb.andWhere('log.entityId = :entityId', { entityId })
    if (userId) qb.andWhere('log.userId = :userId', { userId })
    if (action) qb.andWhere('log.action = :action', { action })

    qb.skip(skip).take(limit).orderBy('log.createdAt', 'DESC')

    const [data, total] = await qb.getManyAndCount()
    return { data, total, page, limit }
  }

  async getEntityHistory(
    tenantId: string,
    entityType: string,
    entityId: string,
  ): Promise<AuditLog[]> {
    return this.auditLogRepository.find({
      where: { tenantId, entityType, entityId },
      order: { createdAt: 'DESC' },
    })
  }
}
