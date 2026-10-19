import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, ManyToOne, JoinColumn, Index,
} from 'typeorm'
import { Order } from './order.entity'
import { Product } from './product.entity'
import { Design } from './design.entity'

export enum ProductionStatus {
  PENDING = 'Pending',
  IN_PROGRESS = 'In_Progress',
  QC = 'QC',
  COMPLETED = 'Completed',
  DISPATCHED = 'Dispatched',
}

@Entity('jeos_job_cards')
@Index(['tenantId', 'productionStatus'])
@Index(['jobCardNumber'])
export class JobCard {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'tenant_id' })
  tenantId: string

  @Column({ name: 'job_card_number', unique: true, nullable: true })
  jobCardNumber: string

  @Column({ name: 'linked_order_id', nullable: true })
  linkedOrderId: string

  @ManyToOne(() => Order, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'linked_order_id' })
  linkedOrder: Order

  @Column({ name: 'customer_name', nullable: true })
  customerName: string

  @Column({ name: 'customer_phone', nullable: true })
  customerPhone: string

  @Column({ name: 'product_id', nullable: true })
  productId: string

  @ManyToOne(() => Product, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'product_id' })
  product: Product

  @Column({ name: 'product_name', nullable: true })
  productName: string

  @Column({ name: 'product_code', nullable: true })
  productCode: string

  @Column({ name: 'design_id', nullable: true })
  designId: string

  @ManyToOne(() => Design, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'design_id' })
  design: Design

  @Column({ name: 'design_name', nullable: true })
  designName: string

  @Column({ name: 'design_code', nullable: true })
  designCode: string

  @Column({ name: 'metal_type', nullable: true })
  metalType: string

  @Column({ name: 'metal_purity', nullable: true })
  metalPurity: string

  @Column({ name: 'metal_color', nullable: true })
  metalColor: string

  @Column({ name: 'gross_weight_g', type: 'numeric', precision: 10, scale: 3, nullable: true })
  grossWeightG: number

  @Column({ name: 'net_weight_g', type: 'numeric', precision: 10, scale: 3, nullable: true })
  netWeightG: number

  @Column({ name: 'diamond_weight_ct', type: 'numeric', precision: 10, scale: 3, nullable: true })
  diamondWeightCt: number

  @Column({ name: 'diamond_shape', nullable: true })
  diamondShape: string

  @Column({ name: 'diamond_quality', nullable: true })
  diamondQuality: string

  @Column({ name: 'product_size', nullable: true })
  productSize: string

  @Column({ type: 'int', default: 1 })
  quantity: number

  @Column({ name: 'order_date', type: 'date', nullable: true })
  orderDate: string

  @Column({ name: 'due_date', type: 'date', nullable: true })
  dueDate: string

  @Column({ name: 'manufacturer_name', nullable: true })
  manufacturerName: string

  @Column({ name: 'vendor_name', nullable: true })
  vendorName: string

  @Column({
    name: 'production_status',
    type: 'enum',
    enum: ProductionStatus,
    default: ProductionStatus.PENDING,
  })
  productionStatus: ProductionStatus

  @Column({ name: 'qc_status', nullable: true })
  qcStatus: string

  @Column({ name: 'qc_by', nullable: true })
  qcBy: string

  @Column({ name: 'qc_completed_at', nullable: true })
  qcCompletedAt: string

  @Column({ name: 'qc_notes', type: 'text', nullable: true })
  qcNotes: string

  @Column({ name: 'qc_photos', type: 'jsonb', default: '[]' })
  qcPhotos: string[]

  @Column({ name: 'dispatched_at', nullable: true })
  dispatchedAt: string

  @Column({ name: 'courier_name', nullable: true })
  courierName: string

  @Column({ name: 'tracking_number', nullable: true })
  trackingNumber: string

  @Column({ name: 'manufacturing_stages', type: 'jsonb', default: '[]' })
  manufacturingStages: Record<string, any>[]

  @Column({ name: 'materials_issued', type: 'jsonb', default: '[]' })
  materialsIssued: Record<string, any>[]

  @Column({ name: 'created_by', nullable: true })
  createdBy: string

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date

  @Column({ name: 'is_deleted', default: false })
  isDeleted: boolean
}
