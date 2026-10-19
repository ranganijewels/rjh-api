import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm'

// Labor / making-charge slab. Matched by metalType + category + carat range +
// weight range. Nullable metalType/category act as wildcards.
@Entity('jeos_labor_rates')
@Index(['tenantId', 'metalType', 'productCategory', 'status', 'effectiveDate'])
export class LaborRate {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'tenant_id' })
  tenantId: string

  @Column({ name: 'metal_type', nullable: true })
  metalType: string // null = any

  @Column({ name: 'product_category', nullable: true })
  productCategory: string // null = any

  @Column({ name: 'min_carat', type: 'numeric', precision: 8, scale: 3, default: 0 })
  minCarat: number

  @Column({ name: 'max_carat', type: 'numeric', precision: 8, scale: 3, default: 99 })
  maxCarat: number

  @Column({ name: 'min_weight_g', type: 'numeric', precision: 10, scale: 3, default: 0 })
  minWeightG: number

  @Column({ name: 'max_weight_g', type: 'numeric', precision: 10, scale: 3, default: 9999 })
  maxWeightG: number

  @Column({ name: 'labor_type', default: 'fixed' })
  laborType: string // fixed | percentage

  @Column({ name: 'labor_rate', type: 'numeric', precision: 14, scale: 4, default: 0 })
  laborRate: number

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
