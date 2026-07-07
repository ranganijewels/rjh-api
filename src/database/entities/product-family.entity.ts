import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm'

/**
 * Product Family — the "design" (e.g. LR-001). One CAD lineage / story.
 * Holds the CONFIGURABLE AXES (rules, not rows) — variants are resolved on demand
 * by the configurator, never pre-materialized. Existing products act as the
 * per-shape "master products" and are linked via masterProductIds.
 */
@Entity('jeos_product_families')
@Index(['tenantId', 'status'])
export class ProductFamily {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'tenant_id' })
  tenantId: string

  @Column({ name: 'family_code', nullable: true })
  familyCode: string

  @Column()
  name: string

  @Column({ nullable: true })
  category: string

  @Column({ name: 'default_shape', nullable: true })
  defaultShape: string

  @Column({ name: 'default_metal_type', nullable: true })
  defaultMetalType: string

  @Column({ name: 'story_md', type: 'text', nullable: true })
  storyMd: string

  // Configurable dimensions: [{ axis, allowedValues[], defaultValue, affectsWeight, affectsPrice }]
  // axis ∈ shape | center_ct | metal_type | purity | color | side_quality | ring_size
  @Column({ type: 'jsonb', default: '[]' })
  axes: Array<Record<string, any>>

  // Existing product ids acting as per-shape master products: [{ shape:'RND', productId }]
  @Column({ name: 'master_products', type: 'jsonb', default: '[]' })
  masterProducts: Array<Record<string, any>>

  @Column({ type: 'jsonb', default: '{}' })
  metadata: Record<string, any>

  // draft | review | approved | published | archived
  @Column({ default: 'draft' })
  status: string

  @Column({ name: 'is_deleted', default: false })
  isDeleted: boolean

  @Column({ name: 'created_by', nullable: true })
  createdBy: string

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date
}
