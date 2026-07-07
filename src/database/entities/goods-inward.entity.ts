import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Supplier } from './supplier.entity';
import { PurchaseOrder } from './purchase-order.entity';
import { InventoryLocation } from './inventory-location.entity';

export enum GoodsInwardStatus {
  PENDING = 'pending',
  UNDER_QC = 'under_qc',
  ACCEPTED = 'accepted',
  PARTIALLY_ACCEPTED = 'partially_accepted',
  REJECTED = 'rejected',
}

@Entity('jeos_goods_inward')
export class GoodsInward {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'grn_number', unique: true, nullable: true })
  grnNumber: string | null;

  @Column({ name: 'purchase_order_id', nullable: true })
  purchaseOrderId: string | null;

  @ManyToOne(() => PurchaseOrder, { nullable: true })
  @JoinColumn({ name: 'purchase_order_id' })
  purchaseOrder: PurchaseOrder | null;

  @Column({ name: 'supplier_id', nullable: true })
  supplierId: string | null;

  @ManyToOne(() => Supplier, { nullable: true })
  @JoinColumn({ name: 'supplier_id' })
  supplier: Supplier | null;

  @Column({ name: 'supplier_name', nullable: true })
  supplierName: string;

  @Column({ name: 'received_date', type: 'date', nullable: true })
  receivedDate: string;

  @Column({ name: 'location_id', nullable: true })
  locationId: string | null;

  @ManyToOne(() => InventoryLocation, { nullable: true })
  @JoinColumn({ name: 'location_id' })
  location: InventoryLocation | null;

  @Column({
    type: 'enum',
    enum: GoodsInwardStatus,
    default: GoodsInwardStatus.PENDING,
  })
  status: GoodsInwardStatus;

  @Column({ type: 'jsonb', default: [] })
  items: Record<string, any>[];

  @Column({ name: 'invoice_number', nullable: true })
  invoiceNumber: string | null;

  @Column({ name: 'invoice_date', type: 'date', nullable: true })
  invoiceDate: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'received_by', nullable: true })
  receivedBy: string;

  @Column({ name: 'qc_by', nullable: true })
  qcBy: string | null;

  @Column({ name: 'qc_completed_at', type: 'timestamptz', nullable: true })
  qcCompletedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
