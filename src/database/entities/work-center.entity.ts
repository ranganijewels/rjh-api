import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm'

@Entity('jeos_work_centers')
@Index(['tenantId'])
export class WorkCenter {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'tenant_id' })
  tenantId: string

  @Column()
  code: string

  @Column()
  name: string

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number

  @Column({ name: 'std_minutes', type: 'numeric', precision: 8, scale: 2, default: 0 })
  stdMinutes: number

  @Column({ default: 'active' })
  status: string

  @Column({ name: 'created_by', nullable: true })
  createdBy: string

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date
}
