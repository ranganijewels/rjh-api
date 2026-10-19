import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm'

export enum NavigationTarget {
  SELF = '_self',
  BLANK = '_blank',
}

@Entity('cms_navigation')
export class CmsNavigation {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'varchar' })
  tenantId: string

  @Column({ type: 'varchar' })
  label: string

  @Column({ type: 'varchar', nullable: true })
  url: string | null

  @Column({ type: 'uuid', nullable: true })
  parentId: string | null

  @Column({ type: 'int', default: 0 })
  sortOrder: number

  @Column({
    type: 'enum',
    enum: NavigationTarget,
    default: NavigationTarget.SELF,
  })
  target: NavigationTarget

  @Column({ type: 'boolean', default: true })
  isActive: boolean

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, unknown>

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date
}
