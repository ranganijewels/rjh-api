import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm'

@Entity('cms_sections')
export class CmsSection {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'varchar' })
  tenantId: string

  @Column({ type: 'varchar' })
  pageSlug: string

  @Column({ type: 'varchar' })
  sectionKey: string

  @Column({ type: 'varchar', nullable: true })
  sectionType: string | null

  @Column({ type: 'varchar', nullable: true })
  label: string | null

  @Column({ type: 'varchar', nullable: true })
  description: string | null

  @Column({ type: 'jsonb', default: '{}' })
  content: Record<string, any>

  @Column({ type: 'int', default: 0 })
  sortOrder: number

  @Column({ type: 'boolean', default: true })
  isPublished: boolean

  @Column({ type: 'varchar', nullable: true })
  createdBy: string | null

  @Column({ type: 'varchar', nullable: true })
  updatedBy: string | null

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date
}
