import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm'

// Additional charges (certification, packaging, insurance, custom). Applied to
// every product unless deactivated.
@Entity('jeos_additional_charges')
@Index(['tenantId', 'status'])
export class AdditionalCharge {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'tenant_id' })
  tenantId: string

  @Column()
  name: string

  @Column({ name: 'charge_type', default: 'custom' })
  chargeType: string // Certification | Packaging | Insurance | Custom

  @Column({ default: 'fixed' })
  method: string // fixed | percentage

  @Column({ type: 'numeric', precision: 14, scale: 4, default: 0 })
  value: number

  @Column({ name: 'effective_date', type: 'timestamptz', nullable: true })
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
