import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm'

// Newsletter sign-ups from the storefront (home section, sign-up popup).
// One row per email per tenant; signing up again just re-subscribes.
@Entity('newsletter_subscribers')
@Index(['tenantId', 'email'], { unique: true })
export class NewsletterSubscriber {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'tenant_id' })
  tenantId: string

  @Column({ length: 255 })
  email: string

  // Where the sign-up came from, e.g. "home" or "popup".
  @Column({ length: 50, nullable: true })
  source: string | null

  @Column({ length: 20, default: 'subscribed' })
  status: string

  @Column({ name: 'subscribed_at', type: 'timestamptz' })
  subscribedAt: Date

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date
}
