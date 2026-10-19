import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm'

@Entity('pricing_config')
@Index(['tenantId'], { unique: true })
export class PricingConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'tenant_id' })
  tenantId: string

  // Metal price per gram by metal type: { "Gold": 6500, "Silver": 85, "Platinum": 3200 }
  @Column({ name: 'metal_prices', type: 'jsonb', default: '{"Gold":6500,"Silver":85,"Platinum":3200}' })
  metalPrices: Record<string, number>

  // Purity multipliers: { "14K": 0.585, "18K": 0.75, "22K": 0.916, "24K": 1.0 }
  @Column({ name: 'metal_purity_multipliers', type: 'jsonb', default: '{"14K":0.585,"14KT":0.585,"18K":0.75,"18KT":0.75,"22K":0.916,"22KT":0.916,"24K":1.0,"24KT":1.0}' })
  metalPurityMultipliers: Record<string, number>

  // Color surcharge multipliers: { "Yellow": 1.0, "White": 1.05, "Rose": 1.03, "Two Tone": 1.08 }
  @Column({ name: 'metal_color_multipliers', type: 'jsonb', default: '{"Yellow":1.0,"White":1.05,"Rose":1.03,"Two Tone":1.08,"yellow":1.0,"white":1.05,"rose":1.03}' })
  metalColorMultipliers: Record<string, number>

  // Diamond price per carat by type: { "Lab Grown Diamond": 45000, "Natural": 180000, "Moissanite": 8000, "CZ": 500 }
  @Column({ name: 'diamond_prices', type: 'jsonb', default: '{"Lab Grown Diamond":45000,"Natural":180000,"Moissanite":8000,"CZ":500,"Other":10000}' })
  diamondPrices: Record<string, number>

  // Diamond quality multipliers: { "F-VS2": 1.0, "E-VS1": 1.2, "D-VVS2": 1.5, "VVS1": 1.8, "IF": 2.2 }
  @Column({ name: 'diamond_quality_multipliers', type: 'jsonb', default: '{"F-VS2":1.0,"E-VS1":1.2,"D-VVS2":1.5,"VVS1":1.8,"IF":2.2,"VS1":1.1,"VS2":0.95}' })
  diamondQualityMultipliers: Record<string, number>

  // Making charge per gram (flat labor per gram of gross weight)
  @Column({ name: 'making_charge_per_gram', type: 'decimal', precision: 10, scale: 2, default: 350 })
  makingChargePerGram: number

  // Additional fixed labor charge per piece
  @Column({ name: 'labor_charge_flat', type: 'decimal', precision: 10, scale: 2, default: 500 })
  laborChargeFlat: number

  // GST percentage
  @Column({ name: 'gst_percent', type: 'decimal', precision: 5, scale: 2, default: 3 })
  gstPercent: number

  // Minimum price floor (ensures product is never priced below this)
  @Column({ name: 'min_price_floor', type: 'decimal', precision: 10, scale: 2, default: 5000 })
  minPriceFloor: number

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}
