import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm'

@Entity('audit_logs')
@Index(['tenantId', 'entityType', 'entityId'])
@Index(['userId'])
@Index(['createdAt'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'tenant_id' })
  tenantId: string

  @Column({ name: 'user_id', nullable: true })
  userId: string

  @Column({ name: 'user_email', nullable: true, length: 255 })
  userEmail: string

  @Column({ name: 'user_role', nullable: true, length: 50 })
  userRole: string

  @Column({ length: 100 })
  action: string

  @Column({ name: 'entity_type', length: 100 })
  entityType: string

  @Column({ name: 'entity_id', nullable: true })
  entityId: string

  @Column({ name: 'old_data', type: 'jsonb', nullable: true })
  oldData: Record<string, any>

  @Column({ name: 'new_data', type: 'jsonb', nullable: true })
  newData: Record<string, any>

  @Column({ name: 'ip_address', type: 'inet', nullable: true })
  ipAddress: string

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent: string

  @Column({ type: 'text', nullable: true })
  notes: string

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date
}
