import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm'

// Maps diamond total carat weight ranges to the expected net metal weight (grams).
// Used by the pricing engine to compute: netWeightG, grossWeightG, and per-gram labour.
@Entity('jeos_diamond_metal_weights')
@Index(['tenantId', 'status', 'effectiveDate'])
export class DiamondMetalWeight {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  tenantId: string

  @Column({ nullable: true })
  metalType: string // Gold, Silver, Platinum (null = any metal)

  @Column({ nullable: true })
  category: string // Rings, Necklaces, etc. (null = any category)

  @Column({ type: 'numeric', precision: 8, scale: 3, default: 0 })
  minDiamondCt: number // inclusive lower bound of diamond carat slab

  @Column({ type: 'numeric', precision: 8, scale: 3, default: 99 })
  maxDiamondCt: number // inclusive upper bound of diamond carat slab

  @Column({ type: 'numeric', precision: 10, scale: 3 })
  metalWeightG: number // net metal weight in grams for this slab

  @Column({ type: 'timestamptz', nullable: true })
  effectiveDate: Date

  @Column({ default: 'active' })
  status: string

  @Column({ nullable: true })
  createdBy: string

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
