import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { InventoryItem } from './inventory-item.entity';
import { InventoryLocation } from './inventory-location.entity';

export enum AdjustmentType {
  INCREASE = 'increase',
  DECREASE = 'decrease',
  CORRECTION = 'correction',
}

export enum StockAdjustmentStatus {
  DRAFT = 'draft',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('jeos_stock_adjustments')
export class StockAdjustment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'adjustment_number', unique: true, nullable: true })
  adjustmentNumber: string | null;

  @Column({
    name: 'adjustment_type',
    type: 'enum',
    enum: AdjustmentType,
  })
  adjustmentType: AdjustmentType;

  @Column({ name: 'adjustment_reason' })
  adjustmentReason: string;

  @Column({ name: 'item_id' })
  itemId: string;

  @ManyToOne(() => InventoryItem)
  @JoinColumn({ name: 'item_id' })
  item: InventoryItem;

  @Column({
    name: 'quantity_before',
    type: 'numeric',
    precision: 10,
    scale: 3,
  })
  quantityBefore: number;

  @Column({
    name: 'quantity_adjusted',
    type: 'numeric',
    precision: 10,
    scale: 3,
  })
  quantityAdjusted: number;

  @Column({
    name: 'quantity_after',
    type: 'numeric',
    precision: 10,
    scale: 3,
  })
  quantityAfter: number;

  @Column({ name: 'location_id', nullable: true })
  locationId: string | null;

  @ManyToOne(() => InventoryLocation, { nullable: true })
  @JoinColumn({ name: 'location_id' })
  location: InventoryLocation | null;

  @Column({
    type: 'enum',
    enum: StockAdjustmentStatus,
    default: StockAdjustmentStatus.DRAFT,
  })
  status: StockAdjustmentStatus;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'created_by', nullable: true })
  createdBy: string;

  @Column({ name: 'approved_by', nullable: true })
  approvedBy: string | null;

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
