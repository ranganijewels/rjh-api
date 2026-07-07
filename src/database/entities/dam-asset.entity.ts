import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm'

/**
 * Digital Asset Management asset record. One row per ingested file (image, 360 video,
 * diamond video, CAD render, certificate, document). `parsedTokens` holds the structured
 * tokens extracted from the naming convention, `aiTags` holds AI-derived labels.
 */
@Entity('jeos_dam_assets')
@Index(['tenantId'])
@Index(['tenantId', 'status'])
export class DamAsset {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'tenant_id' })
  tenantId: string

  // image | video360 | video_diamond | cad | cert | doc
  @Column({ default: 'image' })
  type: string

  @Column({ name: 'file_name' })
  fileName: string

  @Column({ type: 'text', nullable: true })
  url: string

  @Column({ name: 'storage_key', nullable: true })
  storageKey: string

  @Column({ name: 'parsed_tokens', type: 'jsonb', default: '{}' })
  parsedTokens: Record<string, any>

  @Column({ name: 'ai_tags', type: 'jsonb', default: '[]' })
  aiTags: string[]

  @Column({ type: 'numeric', precision: 14, scale: 2, nullable: true })
  bytes: number

  @Column({ nullable: true })
  hash: string

  @Column({ default: 'active' })
  status: string

  @Column({ name: 'created_by', nullable: true })
  createdBy: string

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date
}
