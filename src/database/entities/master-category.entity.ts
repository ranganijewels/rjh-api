import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm'
import { MasterValue } from './master-value.entity'

@Entity('master_categories')
export class MasterCategory {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'varchar' })
  tenantId: string

  @Column({ type: 'varchar', unique: true })
  categoryKey: string

  @Column({ type: 'varchar' })
  categoryLabel: string

  @Column({ type: 'varchar', nullable: true })
  description: string | null

  @Column({ type: 'boolean', default: false })
  isSystem: boolean

  @Column({ type: 'boolean', default: true })
  isActive: boolean

  @Column({ type: 'int', default: 0 })
  sortOrder: number

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date

  @OneToMany(() => MasterValue, (value) => value.category)
  values: MasterValue[]
}
