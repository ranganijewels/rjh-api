import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, OneToMany, Index,
} from 'typeorm'
import { DesignMedia } from './design-media.entity'

@Entity('jeos_designs')
@Index(['tenantId', 'status'])
export class Design {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'tenant_id' })
  tenantId: string

  @Column({ name: 'design_code', unique: true, nullable: true })
  designCode: string

  @Column({ name: 'design_name' })
  designName: string

  @Column({ type: 'text', nullable: true })
  description: string

  @Column({ nullable: true })
  category: string

  @Column({ name: 'metal_type', nullable: true })
  metalType: string

  @Column({ name: 'metal_purity', nullable: true })
  metalPurity: string

  @Column({ name: 'metal_color', nullable: true })
  metalColor: string

  @Column({ name: 'diamond_shape', nullable: true })
  diamondShape: string

  @Column({ name: 'gross_weight_g', type: 'numeric', precision: 10, scale: 3, nullable: true })
  grossWeightG: number

  @Column({ name: 'net_weight_g', type: 'numeric', precision: 10, scale: 3, nullable: true })
  netWeightG: number

  @Column({ name: 'main_image_url', type: 'text', nullable: true })
  mainImageUrl: string

  @Column({ default: 'active' })
  status: string

  @Column({ name: 'is_deleted', default: false })
  isDeleted: boolean

  @Column({ type: 'jsonb', default: '{}' })
  metadata: Record<string, any>

  @OneToMany(() => DesignMedia, (m) => m.design)
  media: DesignMedia[]

  @Column({ name: 'created_by', nullable: true })
  createdBy: string

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date
}
