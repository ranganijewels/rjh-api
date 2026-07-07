import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm'

// One row per country/currency the storefront supports.
// `rate` is "1 BASE (USD) = rate units of this currency".
@Entity('jeos_currencies')
@Index(['tenantId', 'countryCode'], { unique: true })
export class Currency {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'tenant_id' })
  tenantId: string

  @Column({ name: 'country_code', length: 2 })
  countryCode: string // ISO alpha-2, e.g. 'US'

  @Column({ name: 'country_name' })
  countryName: string

  @Column({ name: 'currency_code', length: 3 })
  currencyCode: string // ISO 4217, e.g. 'USD'

  @Column({ name: 'currency_symbol', default: '$' })
  currencySymbol: string

  // 1 USD (base) = `rate` units of this currency
  @Column({ type: 'numeric', precision: 14, scale: 6, default: 1 })
  rate: number

  @Column({ name: 'is_active', default: true })
  isActive: boolean

  @Column({ name: 'is_default', default: false })
  isDefault: boolean

  @Column({ name: 'sort_order', type: 'integer', default: 0 })
  sortOrder: number

  @Column({ name: 'rates_updated_at', type: 'timestamptz', nullable: true })
  ratesUpdatedAt: Date

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date
}
