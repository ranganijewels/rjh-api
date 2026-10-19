import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { InventoryItem } from './inventory-item.entity';

export enum LedgerTransactionType {
  PURCHASE = 'purchase',
  SALE = 'sale',
  TRANSFER_IN = 'transfer_in',
  TRANSFER_OUT = 'transfer_out',
  ADJUSTMENT_IN = 'adjustment_in',
  ADJUSTMENT_OUT = 'adjustment_out',
  RESERVATION = 'reservation',
  RESERVATION_RELEASE = 'reservation_release',
  AUDIT_CORRECTION = 'audit_correction',
}

export enum LedgerReferenceType {
  PURCHASE_ORDER = 'purchase_order',
  ORDER = 'order',
  TRANSFER = 'transfer',
  ADJUSTMENT = 'adjustment',
  AUDIT = 'audit',
}

@Entity('jeos_inventory_ledger')
export class InventoryLedger {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'item_id' })
  itemId: string;

  @ManyToOne(() => InventoryItem)
  @JoinColumn({ name: 'item_id' })
  item: InventoryItem;

  @Column({
    name: 'transaction_type',
    type: 'enum',
    enum: LedgerTransactionType,
  })
  transactionType: LedgerTransactionType;

  @Column({ type: 'numeric', precision: 10, scale: 3 })
  quantity: number;

  @Column({ name: 'balance_before', type: 'numeric', precision: 10, scale: 3 })
  balanceBefore: number;

  @Column({ name: 'balance_after', type: 'numeric', precision: 10, scale: 3 })
  balanceAfter: number;

  @Column({
    name: 'reference_type',
    type: 'enum',
    enum: LedgerReferenceType,
    nullable: true,
  })
  referenceType: LedgerReferenceType | null;

  @Column({ name: 'reference_id', type: 'uuid', nullable: true })
  referenceId: string | null;

  @Column({ name: 'from_location_id', nullable: true })
  fromLocationId: string | null;

  @Column({ name: 'to_location_id', nullable: true })
  toLocationId: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'created_by', nullable: true })
  createdBy: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
