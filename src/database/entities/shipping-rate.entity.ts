import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm'

// Shipping rate master. Resolved by zone/country/state + weight range.
@Entity('jeos_shipping_rates')
@Index(['tenantId', 'country', 'state', 'status', 'effectiveDate'])
export class ShippingRate {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'tenant_id' })
  tenantId: string

  @Column({ nullable: true })
  zone: string

  @Column({ nullable: true })
  country: string // null = any

  @Column({ nullable: true })
  state: string

  @Column({ name: 'min_weight_g', type: 'numeric', precision: 10, scale: 3, default: 0 })
  minWeightG: number

  @Column({ name: 'max_weight_g', type: 'numeric', precision: 10, scale: 3, default: 999999 })
  maxWeightG: number

  @Column({ name: 'shipping_method', nullable: true })
  shippingMethod: string

  @Column({ name: 'rate_type', default: 'fixed' })
  rateType: string // fixed | weight_based (rate per gram)

  @Column({ type: 'numeric', precision: 14, scale: 4, default: 0 })
  rate: number

  @Column({ name: 'estimated_days', nullable: true })
  estimatedDays: string

  @Column({ name: 'effective_date', type: 'timestamptz' })
  effectiveDate: Date

  @Column({ default: 'active' })
  status: string

  @Column({ name: 'created_by', nullable: true })
  createdBy: string

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date
}
