import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm'

@Entity('resize_repair_requests')
export class ResizeRepairRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'varchar' })
  tenantId: string

  @Column({ type: 'varchar', nullable: true })
  customerId: string | null

  @Column({ type: 'varchar' })
  name: string

  @Column({ type: 'varchar', nullable: true })
  email: string | null

  @Column({ type: 'varchar', nullable: true })
  phone: string | null

  @Column({ type: 'varchar', nullable: true })
  orderNumber: string | null

  @Column({ type: 'varchar', default: 'resize' })
  serviceType: 'resize' | 'repair' | 'polish' | 'replating' | 'other'

  @Column({ type: 'text', nullable: true })
  details: string | null

  @Column({ type: 'jsonb', nullable: true })
  attachments: any

  @Column({ type: 'varchar', default: 'new' })
  status: 'new' | 'received' | 'in_progress' | 'ready' | 'completed' | 'declined'

  @Column({ type: 'text', nullable: true })
  internalNotes: string | null

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date

  // Campaign attribution (UTMs, referrer, click ids) + consented Meta match keys.
  @Column({ type: 'jsonb', nullable: true })
  marketing: Record<string, any> | null
}
