import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm'

@Entity('jeos_production_orders')
@Index(['tenantId'])
export class ProductionOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'tenant_id' })
  tenantId: string

  @Column({ name: 'order_no', unique: true, nullable: true })
  orderNo: string

  @Column({ default: 'sales' })
  source: string

  @Column({ name: 'order_id', nullable: true })
  orderId: string

  @Column({ name: 'product_id', nullable: true })
  productId: string

  @Column({ name: 'product_code', nullable: true })
  productCode: string

  @Column({ name: 'variant_code', nullable: true })
  variantCode: string

  @Column({ type: 'int', default: 1 })
  qty: number

  @Column({ default: 'normal' })
  priority: string

  @Column({ name: 'due_date', type: 'date', nullable: true })
  dueDate: string

  @Column({ default: 'created' })
  status: string

  @Column({ name: 'current_step', type: 'int', default: 0 })
  currentStep: number

  @Column({ name: 'created_by', nullable: true })
  createdBy: string

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date
}
