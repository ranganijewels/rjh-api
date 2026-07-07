import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm'

@Entity('jeos_attribute_values')
@Index(['tenantId'])
@Index(['productId'])
@Index(['productId', 'attributeId', 'locale'])
export class AttributeValue {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'tenant_id' })
  tenantId: string

  @Column({ name: 'product_id' })
  productId: string

  @Column({ name: 'attribute_id' })
  attributeId: string

  @Column({ default: 'en' })
  locale: string

  @Column({ type: 'text', nullable: true })
  value: string

  @Column({ name: 'created_by', nullable: true })
  createdBy: string

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date
}
