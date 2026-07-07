import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm'

/**
 * A single URL redirect rule. When a request hits `fromSlug` the storefront should
 * issue an HTTP `code` (301 permanent by default) redirect to `toSlug`.
 */
@Entity('jeos_seo_redirects')
@Index(['tenantId'])
@Index(['tenantId', 'fromSlug'])
export class SeoRedirect {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'tenant_id' })
  tenantId: string

  @Column({ name: 'from_slug' })
  fromSlug: string

  @Column({ name: 'to_slug' })
  toSlug: string

  @Column({ type: 'int', default: 301 })
  code: number

  @Column({ name: 'created_by', nullable: true })
  createdBy: string

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date
}
