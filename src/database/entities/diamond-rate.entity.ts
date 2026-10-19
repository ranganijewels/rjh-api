import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm'

// Diamond pricing slab. Multiple rows form slabs by shape + carat range +
// quality attributes. Nullable attributes act as wildcards ("any").
@Entity('jeos_diamond_rates')
@Index(['tenantId', 'shape', 'status', 'effectiveDate'])
export class DiamondRate {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'tenant_id' })
  tenantId: string

  @Column({ nullable: true })
  shape: string // Round | Princess | Cushion | Oval | Emerald | Pear | Marquise | Custom | null=any

  @Column({ name: 'min_carat', type: 'numeric', precision: 8, scale: 3, default: 0 })
  minCarat: number

  @Column({ name: 'max_carat', type: 'numeric', precision: 8, scale: 3, default: 99 })
  maxCarat: number

  @Column({ nullable: true })
  color: string

  @Column({ nullable: true })
  clarity: string

  @Column({ name: 'quality_grade', nullable: true })
  qualityGrade: string

  @Column({ name: 'cut_grade', nullable: true })
  cutGrade: string

  @Column({ name: 'rate_type', default: 'per_carat' })
  rateType: string // per_carat

  @Column({ name: 'rate_value', type: 'numeric', precision: 14, scale: 4, default: 0 })
  rateValue: number

  @Column({ name: 'effective_date', type: 'timestamptz' })
  effectiveDate: Date

  @Column({ default: 'active' })
  status: string

  @Column({ name: 'created_by', nullable: true })
  createdBy: string

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date
}
