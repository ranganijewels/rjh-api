import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm'

/**
 * Bill of Materials — the engineering source of truth, VERSIONED.
 * A design never edits a live BOM; it creates a new revision (rev_no++). Old
 * revisions stay queryable so an old order can be re-costed/re-made exactly.
 * Pricing AND manufacturing both read this. Metal weight is a CURVE (function of
 * center carat × ring size), not a scalar.
 */
@Entity('jeos_product_boms')
@Index(['tenantId', 'familyId', 'status'])
@Index(['tenantId', 'masterCode', 'status'])
export class ProductBom {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'tenant_id' })
  tenantId: string

  @Column({ name: 'family_id', nullable: true })
  familyId: string

  // The master product / product code this BOM applies to (e.g. LR-001-RND)
  @Column({ name: 'master_code', nullable: true })
  masterCode: string

  @Column({ name: 'rev_no', type: 'int', default: 1 })
  revNo: number

  // draft | review | approved | obsolete
  @Column({ default: 'draft' })
  status: string

  // Metal weight as a function of center carat: { "0.50": 3.2, "1.00": 4.1, "2.00": 5.6 }
  @Column({ name: 'weight_curve', type: 'jsonb', default: '{}' })
  weightCurve: Record<string, number>

  // Grams added/removed per ring size step away from base (larger sizes weigh more).
  @Column({ name: 'ring_size_delta_per_size', type: 'numeric', precision: 8, scale: 3, default: 0 })
  ringSizeDeltaPerSize: number

  @Column({ name: 'base_ring_size', type: 'numeric', precision: 5, scale: 1, default: 6 })
  baseRingSize: number

  @Column({ name: 'metal_loss_pct', type: 'numeric', precision: 6, scale: 3, default: 0 })
  metalLossPct: number

  @Column({ name: 'labor_minutes', type: 'numeric', precision: 8, scale: 2, default: 0 })
  laborMinutes: number

  // Components: [{ type:'side_stone', shape:'RND', ct:0.01, count:20, quality:'VS' }, { type:'setting', ... }]
  @Column({ type: 'jsonb', default: '[]' })
  components: Array<Record<string, any>>

  @Column({ name: 'cad_version', nullable: true })
  cadVersion: string

  @Column({ name: 'mold_version', nullable: true })
  moldVersion: string

  @Column({ name: 'casting_info', type: 'jsonb', nullable: true })
  castingInfo: Record<string, any>

  @Column({ name: 'manufacturing_notes', type: 'text', nullable: true })
  manufacturingNotes: string

  @Column({ name: 'change_log', type: 'text', nullable: true })
  changeLog: string

  @Column({ name: 'effective_date', type: 'timestamptz', nullable: true })
  effectiveDate: Date

  @Column({ name: 'approved_by', nullable: true })
  approvedBy: string

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt: Date

  @Column({ name: 'created_by', nullable: true })
  createdBy: string

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date
}
