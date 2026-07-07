import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, ManyToOne, JoinColumn, Index,
} from 'typeorm'
import { Customer } from './customer.entity'
import { Product } from './product.entity'
import { Design } from './design.entity'

@Entity('jeos_orders')
@Index(['tenantId', 'orderStatus'])
@Index(['orderNumber'])
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'tenant_id' })
  tenantId: string

  @Column({ name: 'order_number', unique: true, nullable: true })
  orderNumber: string

  @Column({ name: 'customer_id', nullable: true })
  customerId: string

  @ManyToOne(() => Customer, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer

  @Column({ name: 'customer_name', nullable: true })
  customerName: string

  @Column({ name: 'customer_phone', nullable: true })
  customerPhone: string

  @Column({ name: 'customer_email', nullable: true })
  customerEmail: string

  @Column({ name: 'customer_address', type: 'text', nullable: true })
  customerAddress: string

  @Column({ name: 'product_id', nullable: true })
  productId: string

  @ManyToOne(() => Product, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'product_id' })
  product: Product

  @Column({ name: 'product_name', nullable: true })
  productName: string

  @Column({ name: 'product_code', nullable: true })
  productCode: string

  @Column({ name: 'product_image_url', type: 'text', nullable: true })
  productImageUrl: string

  @Column({ name: 'design_id', nullable: true })
  designId: string

  @ManyToOne(() => Design, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'design_id' })
  design: Design

  @Column({ name: 'design_name', nullable: true })
  designName: string

  @Column({ name: 'design_code', nullable: true })
  designCode: string

  @Column({ name: 'design_image_url', type: 'text', nullable: true })
  designImageUrl: string

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

  @Column({ name: 'order_status', default: 'Draft' })
  orderStatus: string

  @Column({ name: 'payment_status', default: 'Pending' })
  paymentStatus: string

  @Column({ name: 'order_notes', type: 'text', nullable: true })
  orderNotes: string

  @Column({ name: 'job_card_id', type: 'uuid', nullable: true })
  jobCardId: string

  @Column({ name: 'job_card_status', nullable: true })
  jobCardStatus: string

  @Column({ name: 'total_amount', type: 'numeric', precision: 14, scale: 2, nullable: true })
  totalAmount: number

  @Column({ name: 'advance_amount', type: 'numeric', precision: 14, scale: 2, nullable: true })
  advanceAmount: number

  // ─── Shipping / Fulfillment tracking ──────────────────────────────────────
  @Column({ name: 'tracking_number', nullable: true })
  trackingNumber: string

  @Column({ name: 'courier_name', nullable: true })
  courierName: string

  @Column({ name: 'tracking_url', type: 'text', nullable: true })
  trackingUrl: string

  @Column({ name: 'shipped_at', type: 'timestamptz', nullable: true })
  shippedAt: Date

  @Column({ name: 'delivered_at', type: 'timestamptz', nullable: true })
  deliveredAt: Date

  @Column({ nullable: true })
  channel: string

  @Column({ name: 'channel_order_id', nullable: true })
  channelOrderId: string

  @Column({ name: 'created_by', nullable: true })
  createdBy: string

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date

  @Column({ name: 'is_deleted', default: false })
  isDeleted: boolean
}
