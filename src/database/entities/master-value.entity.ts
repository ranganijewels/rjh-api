import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm'
import { MasterCategory } from './master-category.entity'

@Entity('master_values')
export class MasterValue {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'varchar' })
  tenantId: string

  @Column({ type: 'uuid' })
  categoryId: string

  @ManyToOne(() => MasterCategory, (category) => category.values, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'categoryId' })
  category: MasterCategory

  @Column({ type: 'varchar' })
  valueKey: string

  @Column({ type: 'varchar' })
  valueLabel: string

  @Column({ type: 'varchar', nullable: true })
  description: string | null

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, unknown>

  @Column({ type: 'boolean', default: true })
  isActive: boolean

  @Column({ type: 'int', default: 0 })
  sortOrder: number

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date
}
