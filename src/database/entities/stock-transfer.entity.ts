import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { InventoryLocation } from './inventory-location.entity';

export enum StockTransferStatus {
  DRAFT = 'draft',
  IN_TRANSIT = 'in_transit',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity('jeos_stock_transfers')
export class StockTransfer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'transfer_number', unique: true, nullable: true })
  transferNumber: string | null;

  @Column({ name: 'from_location_id' })
  fromLocationId: string;

  @ManyToOne(() => InventoryLocation)
  @JoinColumn({ name: 'from_location_id' })
  fromLocation: InventoryLocation;

  @Column({ name: 'to_location_id' })
  toLocationId: string;

  @ManyToOne(() => InventoryLocation)
  @JoinColumn({ name: 'to_location_id' })
  toLocation: InventoryLocation;

  @Column({
    type: 'enum',
    enum: StockTransferStatus,
    default: StockTransferStatus.DRAFT,
  })
  status: StockTransferStatus;

  @Column({ type: 'jsonb', default: [] })
  items: Record<string, unknown>[];

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'initiated_by', nullable: true })
  initiatedBy: string | null;

  @Column({ name: 'approved_by', nullable: true })
  approvedBy: string | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
