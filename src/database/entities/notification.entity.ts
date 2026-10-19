import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm'

export enum NotificationType {
  ORDER_UPDATE = 'order_update',
  LOW_STOCK = 'low_stock',
  SYSTEM = 'system',
  CRM = 'crm',
  GENERAL = 'general',
}

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'varchar' })
  tenantId: string

  @Column({ type: 'varchar', nullable: true })
  userId: string | null

  @Column({
    type: 'enum',
    enum: NotificationType,
    default: NotificationType.GENERAL,
  })
  type: NotificationType

  @Column({ type: 'varchar' })
  title: string

  @Column({ type: 'text' })
  message: string

  @Column({ type: 'boolean', default: false })
  isRead: boolean

  @Column({ type: 'timestamptz', nullable: true })
  readAt: Date | null

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, unknown>

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date
}
