import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm'

/**
 * Generic, admin-extensible catalog master data — the "shapes are data, never code"
 * table. One table holds every kind of catalog reference value, discriminated by
 * `kind`: diamond_shape, metal_type, metal_purity, metal_color, diamond_quality,
 * setting_type, … (kinds are open-ended). Admin can create unlimited kinds and values.
 */
@Entity('jeos_catalog_masters')
@Index(['tenantId', 'kind', 'status'])
@Index(['tenantId', 'kind', 'code'])
export class CatalogMaster {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'tenant_id' })
  tenantId: string

  // e.g. diamond_shape | metal_type | metal_purity | metal_color | diamond_quality | setting_type
  @Column()
  kind: string

  @Column()
  code: string

  @Column()
  name: string

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number

  // Search synonyms ("Round Cut" → RND) used by the search facet engine.
  @Column({ type: 'jsonb', default: '[]' })
  synonyms: string[]

  @Column({ name: 'seo_slug', nullable: true })
  seoSlug: string

  // Free-form: hex for colors, applicableMetals for purities, icon asset, parentKind, etc.
  @Column({ type: 'jsonb', default: '{}' })
  metadata: Record<string, any>

  @Column({ default: 'active' })
  status: string

  @Column({ name: 'created_by', nullable: true })
  createdBy: string

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date
}
