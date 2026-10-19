import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm'

/**
 * Account — company / B2B account record. Drives price-book entitlement and
 * account hierarchy (parentAccountId). type determines pricing segment:
 * b2c | b2b | wholesale | franchise. A b2b/wholesale account may pin a specific
 * priceBookId so its customers resolve to that book regardless of customerType.
 */
@Entity('jeos_accounts')
@Index(['tenantId'])
@Index(['tenantId', 'type', 'status'])
export class Account {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'tenant_id' })
  tenantId: string

  // b2c | b2b | wholesale | franchise
  @Column({ default: 'b2c' })
  type: string

  @Column()
  name: string

  @Column({ name: 'contact_email', nullable: true })
  contactEmail: string

  @Column({ name: 'contact_phone', nullable: true })
  contactPhone: string

  // e.g. NET-30, NET-60, COD
  @Column({ name: 'credit_terms', nullable: true })
  creditTerms: string

  @Column({ name: 'credit_limit', type: 'numeric', precision: 14, scale: 2, nullable: true })
  creditLimit: number

  // links to jeos_price_books
  @Column({ name: 'price_book_id', nullable: true })
  priceBookId: string

  // hierarchy — parent account
  @Column({ name: 'parent_account_id', nullable: true })
  parentAccountId: string

  @Column({ name: 'currency_code', nullable: true })
  currencyCode: string

  @Column({ nullable: true })
  country: string

  @Column({ name: 'gst_number', nullable: true })
  gstNumber: string

  @Column({ default: 'active' })
  status: string

  @Column({ type: 'jsonb', default: '{}' })
  metadata: Record<string, any>

  @Column({ name: 'created_by', nullable: true })
  createdBy: string

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date
}
