import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm'

export interface QuoteLine {
  productId?: string
  productName?: string
  variantCode?: string
  qty?: number
  unitPrice?: number
  lineTotal?: number
}

/**
 * Quote — B2B / custom quotations. A quote captures a set of priced lines for a
 * prospective customer (optionally tied to an account + price book). It moves
 * through draft → sent → negotiating → accepted/expired and can be converted to
 * an order.
 */
@Entity('jeos_quotes')
@Index(['tenantId'])
@Index(['tenantId', 'status'])
export class Quote {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'tenant_id' })
  tenantId: string

  @Column({ name: 'quote_number', unique: true, nullable: true })
  quoteNumber: string

  @Column({ name: 'account_id', nullable: true })
  accountId: string

  @Column({ name: 'customer_name', nullable: true })
  customerName: string

  @Column({ name: 'customer_email', nullable: true })
  customerEmail: string

  // draft | sent | negotiating | accepted | expired | converted
  @Column({ default: 'draft' })
  status: string

  @Column({ type: 'jsonb', default: '[]' })
  lines: QuoteLine[]

  @Column({ type: 'numeric', precision: 14, scale: 2, nullable: true })
  subtotal: number

  @Column({ type: 'numeric', precision: 14, scale: 2, nullable: true })
  discount: number

  @Column({ type: 'numeric', precision: 14, scale: 2, nullable: true })
  total: number

  @Column({ name: 'currency_code', nullable: true })
  currencyCode: string

  @Column({ name: 'valid_until', type: 'timestamptz', nullable: true })
  validUntil: Date

  @Column({ type: 'text', nullable: true })
  notes: string

  @Column({ name: 'price_book_id', nullable: true })
  priceBookId: string

  @Column({ name: 'created_by', nullable: true })
  createdBy: string

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date
}
