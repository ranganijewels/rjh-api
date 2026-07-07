import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm'

@Entity('jeos_return_rmas')
@Index(['tenantId'])
export class ReturnRma {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'tenant_id' })
  tenantId: string

  @Column({ name: 'rma_number', nullable: true })
  rmaNumber: string | null

  @Column({ name: 'order_id', nullable: true })
  orderId: string | null

  @Column({ name: 'order_number', nullable: true })
  orderNumber: string | null

  @Column({ type: 'text', nullable: true })
  reason: string | null

  @Column({ default: 'return' })
  type: string

  @Column({ default: 'requested' })
  status: string

  @Column({
    name: 'refund_amount',
    type: 'numeric',
    precision: 14,
    scale: 2,
    nullable: true,
  })
  refundAmount: number | null

  @Column({ name: 'created_by', nullable: true })
  createdBy: string

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date
}
