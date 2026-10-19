import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm'

// Tax configuration. Resolved by country + state (state nullable = country-wide).
@Entity('jeos_tax_rates')
@Index(['tenantId', 'country', 'state', 'status', 'effectiveDate'])
export class TaxRate {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'tenant_id' })
  tenantId: string

  @Column()
  name: string

  @Column({ name: 'tax_type', default: 'GST' })
  taxType: string // GST | VAT | Sales Tax | Import Duty | Custom

  @Column({ default: 'percentage' })
  method: string // fixed | percentage

  @Column({ type: 'numeric', precision: 14, scale: 4, default: 0 })
  value: number

  @Column({ nullable: true })
  country: string // null = applies to all

  @Column({ nullable: true })
  state: string

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
