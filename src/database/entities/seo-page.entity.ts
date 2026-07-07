import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm'

/**
 * Programmatic SEO landing page. One row per indexable URL the storefront should
 * serve — facet pages (e.g. "2-carat-round-engagement-rings"), category hubs,
 * master-driven pages, or CMS-backed pages. Discriminated by `type`.
 */
@Entity('jeos_seo_pages')
@Index(['tenantId'])
@Index(['tenantId', 'urlSlug'])
export class SeoPage {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'tenant_id' })
  tenantId: string

  // master | category | facet | cms
  @Column({ default: 'facet' })
  type: string

  @Column({ name: 'url_slug' })
  urlSlug: string

  @Column({ nullable: true })
  target: string

  @Column({ name: 'target_ref', nullable: true })
  targetRef: string

  @Column({ name: 'meta_title', nullable: true })
  metaTitle: string

  @Column({ name: 'meta_description', type: 'text', nullable: true })
  metaDescription: string

  @Column({ nullable: true })
  h1: string

  @Column({ name: 'intro_md', type: 'text', nullable: true })
  introMd: string

  @Column({ name: 'canonical_to', nullable: true })
  canonicalTo: string

  @Column({ default: true })
  indexable: boolean

  @Column({ type: 'numeric', precision: 3, scale: 2, default: 0.5 })
  priority: number

  @Column({ name: 'lastmod', type: 'timestamptz', nullable: true })
  lastmod: Date

  @Column({ default: 'published' })
  status: string

  @Column({ name: 'created_by', nullable: true })
  createdBy: string

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date
}
