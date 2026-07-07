import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, OneToMany, Index,
} from 'typeorm'
import { CustomerAddress } from './customer-address.entity'

export enum CustomerType {
  RETAIL = 'retail',
  WHOLESALE = 'wholesale',
  CORPORATE = 'corporate',
}

@Entity('jeos_customers')
@Index(['tenantId', 'isActive'])
export class Customer {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'tenant_id' })
  tenantId: string

  @Column({ name: 'customer_code', unique: true, nullable: true })
  customerCode: string

  @Column({ name: 'customer_name' })
  customerName: string

  @Column({ nullable: true })
  @Index()
  email: string

  @Column({ nullable: true })
  phone: string

  @Column({ name: 'alternate_phone', nullable: true })
  alternatePhone: string

  @Column({ nullable: true })
  city: string

  @Column({ nullable: true })
  state: string

  @Column({ nullable: true })
  country: string

  @Column({ type: 'text', nullable: true })
  address: string

  @Column({ nullable: true })
  pincode: string

  @Column({ name: 'gst_number', nullable: true })
  gstNumber: string

  @Column({ name: 'pan_number', nullable: true })
  panNumber: string

  @Column({
    name: 'customer_type',
    type: 'enum',
    enum: CustomerType,
    default: CustomerType.RETAIL,
  })
  customerType: CustomerType

  @Column({ name: 'total_orders', type: 'int', default: 0 })
  totalOrders: number

  @Column({ name: 'total_spend', type: 'numeric', precision: 14, scale: 2, default: 0 })
  totalSpend: number

  @Column({ type: 'text', nullable: true })
  notes: string

  @Column({ type: 'jsonb', default: '[]' })
  tags: string[]

  @Column({ name: 'is_active', default: true })
  isActive: boolean

  @Column({ name: 'created_by', nullable: true })
  createdBy: string

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date

  @Column({ name: 'is_deleted', default: false })
  isDeleted: boolean

  @OneToMany(() => CustomerAddress, (addr) => addr.customer)
  addresses: CustomerAddress[]
}
