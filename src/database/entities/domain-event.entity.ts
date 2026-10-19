import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm'

@Entity('jeos_domain_events')
@Index(['tenantId'])
export class DomainEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'tenant_id' })
  tenantId: string

  @Column({ name: 'aggregate_type' })
  aggregateType: string

  @Column({ name: 'aggregate_id' })
  aggregateId: string

  @Column({ name: 'event_type' })
  eventType: string

  @Column({ type: 'jsonb', default: '{}' })
  payload: Record<string, any>

  @Column({ default: 'pending' })
  status: string

  @Column({ name: 'processed_at', type: 'timestamptz', nullable: true })
  processedAt: Date | null

  @Column({ type: 'text', nullable: true })
  source: string | null

  @Column({ name: 'created_by', nullable: true })
  createdBy: string

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date
}
