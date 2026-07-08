import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm'

/**
 * Merchandising collection ("Bridal", "Best Sellers", …) managed from the admin
 * panel. Each collection has a URL slug so the storefront can render it at
 * /collections/<slug> and the CMS can link to it like any other page.
 *
 * Membership is the union of:
 *   - productIds (explicit assignment from the admin Collections manager)
 *   - products whose collection_name matches `name` (legacy text field on the
 *     product form — kept so existing data keeps working)
 */
@Entity('jeos_collections')
@Index(['tenantId', 'slug'], { unique: true })
@Index(['tenantId', 'status'])
export class Collection {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'tenant_id' })
  tenantId: string

  @Column()
  name: string

  @Column()
  slug: string

  @Column({ type: 'text', nullable: true })
  description: string

  // Banner / hero image shown on the collection page.
  @Column({ name: 'hero_image', nullable: true })
  heroImage: string

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number

  // Explicitly assigned product ids (admin picker). Kept as jsonb so no join
  // table is needed and assignment stays a single-row update.
  @Column({ name: 'product_ids', type: 'jsonb', default: '[]' })
  productIds: string[]

  @Column({ default: 'active' })
  status: string

  @Column({ name: 'created_by', nullable: true })
  createdBy: string

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date
}
