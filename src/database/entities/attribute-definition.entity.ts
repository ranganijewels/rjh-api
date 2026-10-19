import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm'

@Entity('jeos_attribute_definitions')
@Index(['tenantId'])
export class AttributeDefinition {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'tenant_id' })
  tenantId: string

  @Column()
  code: string

  @Column()
  label: string

  // text | number | select | boolean | date
  @Column({ default: 'text' })
  type: string

  // Diamond | Metal | Dimensions | Care
  @Column({ name: 'group_name', nullable: true })
  groupName: string

  @Column({ name: 'is_localized', default: false })
  isLocalized: boolean

  @Column({ name: 'is_variant_axis', default: false })
  isVariantAxis: boolean

  @Column({ name: 'is_required', default: false })
  isRequired: boolean

  // for select type
  @Column({ type: 'jsonb', default: '[]' })
  options: any[]

  @Column({ type: 'jsonb', default: '{}' })
  validation: Record<string, any>

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number

  @Column({ default: 'active' })
  status: string

  @Column({ name: 'created_by', nullable: true })
  createdBy: string

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date
}
