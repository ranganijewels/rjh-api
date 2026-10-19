import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm'

@Entity('jeos_service_requests')
@Index(['tenantId'])
export class ServiceRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'tenant_id' })
  tenantId: string

  @Column({ default: 'repair' })
  type: string

  @Column({ name: 'order_id', nullable: true })
  orderId: string | null

  @Column({ name: 'customer_name', nullable: true })
  customerName: string | null

  @Column({ name: 'customer_email', nullable: true })
  customerEmail: string | null

  @Column({ name: 'product_code', nullable: true })
  productCode: string | null

  @Column({ type: 'text', nullable: true })
  description: string | null

  @Column({ default: 'open' })
  status: string

  @Column({ name: 'linked_production_order_id', nullable: true })
  linkedProductionOrderId: string | null

  @Column({ name: 'created_by', nullable: true })
  createdBy: string

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date
}
