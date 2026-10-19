import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm'

@Entity('cms_blogs')
export class CmsBlog {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'varchar' })
  tenantId: string

  @Column({ type: 'varchar', unique: true })
  slug: string

  @Column({ type: 'varchar' })
  title: string

  @Column({ type: 'text', nullable: true })
  excerpt: string | null

  @Column({ type: 'text' })
  content: string

  @Column({ type: 'text', nullable: true })
  featuredImageUrl: string | null

  @Column({ type: 'jsonb', default: [] })
  tags: string[]

  @Column({ type: 'boolean', default: false })
  isPublished: boolean

  @Column({ type: 'timestamptz', nullable: true })
  publishedAt: Date | null

  @Column({ type: 'varchar', nullable: true })
  author: string | null

  @Column({ type: 'varchar', nullable: true })
  createdBy: string | null

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date
}
