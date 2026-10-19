import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Notification, NotificationType } from '../../database/entities/notification.entity'
import { PaginationDto, paginate, getSkip } from '../../common/dto/pagination.dto'

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
  ) {}

  async getUserNotifications(tenantId: string, userId: string, dto: PaginationDto) {
    const qb = this.notificationRepo
      .createQueryBuilder('n')
      .where('n.tenantId = :tenantId', { tenantId })
      .andWhere('(n.userId = :userId OR n.userId IS NULL)', { userId })
      .orderBy(`n.${dto.sortBy || 'createdAt'}`, dto.sortDir === 'asc' ? 'ASC' : 'DESC')
      .skip(getSkip(dto))
      .take(dto.limit || 20)

    const [data, total] = await qb.getManyAndCount()
    return paginate(data, total, dto)
  }

  async createNotification(
    tenantId: string,
    userId: string | null,
    type: NotificationType,
    title: string,
    message: string,
    metadata?: Record<string, unknown>,
  ): Promise<Notification> {
    const notification = this.notificationRepo.create({
      tenantId,
      userId,
      type,
      title,
      message,
      metadata: metadata || {},
      isRead: false,
    })
    return this.notificationRepo.save(notification)
  }

  async markRead(tenantId: string, id: string, userId: string): Promise<Notification> {
    const notification = await this.notificationRepo.findOne({
      where: { id, tenantId },
    })
    if (!notification) throw new NotFoundException('Notification not found')

    if (!notification.isRead) {
      notification.isRead = true
      notification.readAt = new Date()
      await this.notificationRepo.save(notification)
    }

    return notification
  }

  async markAllRead(tenantId: string, userId: string): Promise<{ updated: number }> {
    const result = await this.notificationRepo
      .createQueryBuilder()
      .update(Notification)
      .set({ isRead: true, readAt: new Date() })
      .where('tenantId = :tenantId', { tenantId })
      .andWhere('(userId = :userId OR userId IS NULL)', { userId })
      .andWhere('isRead = false')
      .execute()

    return { updated: result.affected || 0 }
  }

  async getUnreadCount(tenantId: string, userId: string): Promise<{ count: number }> {
    const count = await this.notificationRepo
      .createQueryBuilder('n')
      .where('n.tenantId = :tenantId', { tenantId })
      .andWhere('(n.userId = :userId OR n.userId IS NULL)', { userId })
      .andWhere('n.isRead = false')
      .getCount()

    return { count }
  }
}
