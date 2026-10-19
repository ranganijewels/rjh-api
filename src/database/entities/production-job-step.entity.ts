import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm'

@Entity('jeos_production_job_steps')
@Index(['tenantId'])
export class ProductionJobStep {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'tenant_id' })
  tenantId: string

  @Column({ name: 'production_order_id' })
  productionOrderId: string

  @Column({ name: 'work_center_id', nullable: true })
  workCenterId: string

  @Column({ name: 'work_center_code', nullable: true })
  workCenterCode: string

  @Column({ name: 'step_no', type: 'int' })
  stepNo: number

  @Column({ default: 'pending' })
  status: string

  @Column({ name: 'assigned_to', nullable: true })
  assignedTo: string

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt: Date

  @Column({ name: 'finished_at', type: 'timestamptz', nullable: true })
  finishedAt: Date

  @Column({ name: 'qc_result', nullable: true })
  qcResult: string

  @Column({ name: 'scrap_qty', type: 'int', default: 0 })
  scrapQty: number

  @Column({ name: 'photo_asset_ids', type: 'jsonb', default: '[]' })
  photoAssetIds: string[]

  @Column({ type: 'text', nullable: true })
  notes: string

  @Column({ name: 'created_by', nullable: true })
  createdBy: string

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date
}
