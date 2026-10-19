import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm'

@Entity('jeos_warranty_registrations')
@Index(['tenantId'])
export class WarrantyRegistration {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'tenant_id' })
  tenantId: string

  @Column({ name: 'order_id', nullable: true })
  orderId: string | null

  @Column({ name: 'order_number', nullable: true })
  orderNumber: string | null

  @Column({ name: 'customer_id', nullable: true })
  customerId: string | null

  @Column({ name: 'customer_name', nullable: true })
  customerName: string | null

  @Column({ name: 'product_code', nullable: true })
  productCode: string | null

  @Column({ nullable: true })
  terms: string | null

  @Column({ name: 'registered_at', type: 'timestamptz', nullable: true })
  registeredAt: Date | null

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt: Date | null

  @Column({ default: 'active' })
  status: string

  @Column({ name: 'created_by', nullable: true })
  createdBy: string

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date
}
