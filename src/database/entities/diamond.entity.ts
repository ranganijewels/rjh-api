import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, ManyToOne, JoinColumn, Index,
} from 'typeorm'
import { InventoryLocation } from './inventory-location.entity'
import { Supplier } from './supplier.entity'

export enum CertificationLab {
  IGI = 'IGI',
  GIA = 'GIA',
  HRD = 'HRD',
  GCAL = 'GCAL',
  IGL = 'IGL',
  NONE = 'none',
}

export enum DiamondStatus {
  AVAILABLE = 'available',
  RESERVED = 'reserved',
  SOLD = 'sold',
  RETURNED = 'returned',
}

@Entity('diamonds')
@Index(['tenantId', 'status'])
@Index(['certificateNumber'])
export class Diamond {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'tenant_id' })
  tenantId: string

  @Column({ name: 'certificate_number', unique: true, nullable: true })
  certificateNumber: string

  @Column({
    name: 'certification_lab',
    type: 'enum',
    enum: CertificationLab,
  })
  certificationLab: CertificationLab

  @Column()
  shape: string

  @Column({ name: 'carat_weight', type: 'numeric', precision: 8, scale: 3 })
  caratWeight: number

  @Column()
  color: string

  @Column()
  clarity: string

  @Column({ nullable: true })
  cut: string

  @Column({ nullable: true })
  polish: string

  @Column({ nullable: true })
  symmetry: string

  @Column({ nullable: true })
  fluorescence: string

  @Column({ nullable: true })
  measurements: string

  @Column({ name: 'table_percent', type: 'numeric', precision: 5, scale: 2, nullable: true })
  tablePercent: number

  @Column({ name: 'depth_percent', type: 'numeric', precision: 5, scale: 2, nullable: true })
  depthPercent: number

  @Column({ name: 'rap_price', type: 'numeric', precision: 14, scale: 2, nullable: true })
  rapPrice: number

  @Column({ name: 'discount_percent', type: 'numeric', precision: 6, scale: 2, nullable: true })
  discountPercent: number

  @Column({ name: 'final_price', type: 'numeric', precision: 14, scale: 2, nullable: true })
  finalPrice: number

  @Column({ default: 'USD' })
  currency: string

  @Column({
    type: 'enum',
    enum: DiamondStatus,
    default: DiamondStatus.AVAILABLE,
  })
  status: DiamondStatus

  @Column({ name: 'location_id', nullable: true })
  locationId: string

  @ManyToOne(() => InventoryLocation, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'location_id' })
  location: InventoryLocation

  @Column({ name: 'supplier_id', nullable: true })
  supplierId: string

  @ManyToOne(() => Supplier, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'supplier_id' })
  supplier: Supplier

  @Column({ name: 'invoice_number', nullable: true })
  invoiceNumber: string

  @Column({ name: 'purchase_date', type: 'date', nullable: true })
  purchaseDate: string

  @Column({ name: 'certificate_url', type: 'text', nullable: true })
  certificateUrl: string

  @Column({ name: 'image_url', type: 'text', nullable: true })
  imageUrl: string

  @Column({ type: 'text', nullable: true })
  notes: string

  @Column({ name: 'ai_grading_data', type: 'jsonb', default: '{}' })
  aiGradingData: Record<string, any>

  @Column({ name: 'created_by', nullable: true })
  createdBy: string

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date

  @Column({ name: 'is_deleted', default: false })
  isDeleted: boolean
}
