import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm'

/**
 * Binds a DAM asset to a catalog reference (product / family / variant). `bindLevel`
 * discriminates the granularity; `refId` is the productId / familyId / code the asset
 * is attached to. `viewCode` carries the parsed view token (FR|SP|TP|LG|HD).
 */
@Entity('jeos_product_asset_bindings')
@Index(['tenantId'])
@Index(['tenantId', 'refId'])
export class ProductAssetBinding {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'tenant_id' })
  tenantId: string

  @Column({ name: 'asset_id' })
  assetId: string

  // family | master | variant
  @Column({ name: 'bind_level', default: 'master' })
  bindLevel: string

  // productId / familyId / code
  @Column({ name: 'ref_id' })
  refId: string

  @Column({ name: 'metal_color', nullable: true })
  metalColor: string

  // FR | SP | TP | LG | HD
  @Column({ name: 'view_code', nullable: true })
  viewCode: string

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number

  @Column({ name: 'is_primary', default: false })
  isPrimary: boolean

  @Column({ name: 'created_by', nullable: true })
  createdBy: string

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date
}
