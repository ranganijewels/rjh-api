import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm'

/**
 * Price Book — multi-audience pricing. The SAME BOM + rate masters compute a base
 * price; the price book applies a channel/segment-specific margin, markup, and
 * discount. Retail ≠ wholesale ≠ B2B ≠ VIP ≠ marketplace. Resolved by
 * customer.customerType (+ optional country/currency overlay).
 */
@Entity('jeos_price_books')
@Index(['tenantId', 'status'])
@Index(['tenantId', 'customerType', 'status'])
export class PriceBook {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'tenant_id' })
  tenantId: string

  @Column()
  code: string

  @Column()
  name: string

  // retail | wholesale | b2b | vip | marketplace
  @Column({ default: 'retail' })
  channel: string

  // maps to Customer.customerType: retail | wholesale | corporate (nullable = any)
  @Column({ name: 'customer_type', nullable: true })
  customerType: string

  @Column({ nullable: true })
  country: string

  @Column({ name: 'currency_code', nullable: true })
  currencyCode: string

  // If set, overrides the engine's default margin for this book.
  @Column({ name: 'margin_percent', type: 'numeric', precision: 8, scale: 3, nullable: true })
  marginPercent: number

  // Additional markup applied on top of the computed (base + margin).
  @Column({ name: 'markup_percent', type: 'numeric', precision: 8, scale: 3, default: 0 })
  markupPercent: number

  // Book-level discount (e.g. wholesale −20%).
  @Column({ name: 'discount_percent', type: 'numeric', precision: 8, scale: 3, default: 0 })
  discountPercent: number

  @Column({ type: 'int', default: 0 })
  priority: number

  @Column({ default: 'active' })
  status: string

  @Column({ name: 'created_by', nullable: true })
  createdBy: string

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date
}
