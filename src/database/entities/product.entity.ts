import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, OneToMany, Index,
} from 'typeorm'
import { ProductMedia } from './product-media.entity'

@Entity('jeos_products')
@Index(['tenantId', 'status'])
@Index(['productCode'])
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'tenant_id' })
  tenantId: string

  @Column({ name: 'product_code', unique: true, nullable: true })
  productCode: string

  @Column({ name: 'product_name' })
  productName: string

  @Column({ name: 'shopify_sku', nullable: true })
  shopifySku: string

  @Column({ name: 'collection_name', nullable: true })
  collectionName: string

  @Column({ type: 'text', nullable: true })
  description: string

  @Column({ name: 'short_description', type: 'text', nullable: true })
  shortDescription: string

  @Column({ name: 'long_description', type: 'text', nullable: true })
  longDescription: string

  @Column({ nullable: true })
  category: string

  @Column({ name: 'sub_category', nullable: true })
  subCategory: string

  @Column({ name: 'metal_type', nullable: true })
  metalType: string

  @Column({ name: 'metal_purity', nullable: true })
  metalPurity: string

  @Column({ name: 'metal_color', nullable: true })
  metalColor: string

  @Column({ name: 'diamond_shape', nullable: true })
  diamondShape: string

  @Column({ name: 'diamond_quality', nullable: true })
  diamondQuality: string

  // ─── Diamond 4Cs (luxury grading detail) ──────────────────────────────────
  @Column({ name: 'diamond_cut', nullable: true })
  diamondCut: string

  @Column({ name: 'diamond_color', nullable: true })
  diamondColor: string

  @Column({ name: 'diamond_clarity', nullable: true })
  diamondClarity: string

  // ─── Certification (GIA / IGI / IGL / HRD) ─────────────────────────────────
  @Column({ name: 'diamond_cert_lab', nullable: true })
  diamondCertLab: string

  @Column({ name: 'diamond_cert_number', nullable: true })
  diamondCertNumber: string

  @Column({ name: 'diamond_cert_url', type: 'text', nullable: true })
  diamondCertUrl: string

  @Column({ name: 'diamond_type', nullable: true })
  diamondType: string

  @Column({ name: 'diamond_count', type: 'integer', nullable: true })
  diamondCount: number

  @Column({ name: 'center_stone_shape', nullable: true })
  centerStoneShape: string

  @Column({ name: 'center_stone_weight_ct', type: 'numeric', precision: 10, scale: 3, nullable: true })
  centerStoneWeightCt: number

  @Column({ name: 'side_stone_details', type: 'text', nullable: true })
  sideStoneDetails: string

  @Column({ name: 'ring_size', nullable: true })
  ringSize: string

  @Column({ name: 'gross_weight_g', type: 'numeric', precision: 10, scale: 3, nullable: true })
  grossWeightG: number

  @Column({ name: 'net_weight_g', type: 'numeric', precision: 10, scale: 3, nullable: true })
  netWeightG: number

  @Column({ name: 'diamond_weight_ct', type: 'numeric', precision: 10, scale: 3, nullable: true })
  diamondWeightCt: number

  @Column({ name: 'length_mm', type: 'numeric', precision: 10, scale: 2, nullable: true })
  lengthMm: number

  @Column({ name: 'width_mm', type: 'numeric', precision: 10, scale: 2, nullable: true })
  widthMm: number

  @Column({ name: 'height_mm', type: 'numeric', precision: 10, scale: 2, nullable: true })
  heightMm: number

  @Column({ name: 'making_charge', type: 'numeric', precision: 14, scale: 2, nullable: true })
  makingCharge: number

  // NOTE: products NEVER store a price (no MRP/SRP). The final price is computed
  // dynamically by the Pricing Engine from the rate-master tables.

  @Column({ name: 'main_image_url', type: 'text', nullable: true })
  mainImageUrl: string

  @Column({ name: 'render_file_url', type: 'text', nullable: true })
  renderFileUrl: string

  @Column({ name: 'cad_file_url', type: 'text', nullable: true })
  cadFileUrl: string

  @Column({ name: 'video_url', type: 'text', nullable: true })
  videoUrl: string

  @Column({ name: 'seo_title', nullable: true })
  seoTitle: string

  @Column({ name: 'seo_description', type: 'text', nullable: true })
  seoDescription: string

  @Column({ name: 'shopify_tags', nullable: true })
  shopifyTags: string

  @Column({ name: 'shopify_product_id', nullable: true })
  shopifyProductId: string

  @Column({ default: 'active' })
  status: string

  @Column({ name: 'is_ready_for_qc', default: false })
  isReadyForQc: boolean

  @Column({ name: 'is_ready_for_shopify', default: false })
  isReadyForShopify: boolean

  @Column({ name: 'ai_missing_fields', type: 'jsonb', nullable: true })
  aiMissingFields: string[]

  @Column({ name: 'parent_product_id', nullable: true })
  parentProductId: string

  @Column({ name: 'variant_type', nullable: true })
  variantType: string

  @Column({ name: 'variant_value', nullable: true })
  variantValue: string

  @Column({ name: 'is_deleted', default: false })
  isDeleted: boolean

  @Column({ name: 'shopify_synced', default: false })
  shopifySynced: boolean

  @Column({ name: 'ai_description', type: 'text', nullable: true })
  aiDescription: string

  @Column({ name: 'ai_tags', type: 'jsonb', default: '[]' })
  aiTags: string[]

  @Column({ type: 'jsonb', default: '{}' })
  metadata: Record<string, any>

  @OneToMany(() => ProductMedia, (m) => m.product)
  media: ProductMedia[]

  @Column({ name: 'created_by', nullable: true })
  createdBy: string

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date
}
