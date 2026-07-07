import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm'

// Effective-dated metal rate. History is preserved by inserting new rows
// (never updating in place); the engine resolves the latest active row whose
// effectiveDate <= now. Future-dated rows enable scheduled rate changes.
@Entity('jeos_metal_rates')
@Index(['tenantId', 'metalType', 'purity', 'status', 'effectiveDate'])
export class MetalRate {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'tenant_id' })
  tenantId: string

  @Column({ name: 'metal_type' })
  metalType: string // Gold | Silver | Platinum | Rose Gold | White Gold

  @Column()
  purity: string // 24K | 22K | 18K | 14K | Custom

  @Column({ name: 'rate_unit', default: 'per_gram' })
  rateUnit: string // per_gram | per_ounce

  @Column({ type: 'numeric', precision: 14, scale: 4, default: 0 })
  rate: number

  @Column({ name: 'effective_date', type: 'timestamptz' })
  effectiveDate: Date

  @Column({ default: 'active' })
  status: string // active | inactive

  @Column({ name: 'created_by', nullable: true })
  createdBy: string

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date
}
