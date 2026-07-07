import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { InventoryItem } from './inventory-item.entity';

export enum ReservationForType {
  ORDER = 'order',
  JOB_CARD = 'job_card',
  OTHER = 'other',
}

export enum ReservationStatus {
  ACTIVE = 'active',
  RELEASED = 'released',
  FULFILLED = 'fulfilled',
}

@Entity('jeos_stock_reservations')
export class StockReservation {
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
    name: 'quantity_reserved',
    type: 'numeric',
    precision: 10,
    scale: 3,
  })
  quantityReserved: number;

  @Column({
    name: 'reserved_for_type',
    type: 'enum',
    enum: ReservationForType,
  })
  reservedForType: ReservationForType;

  @Column({ name: 'reserved_for_id', type: 'uuid' })
  reservedForId: string;

  @Column({
    type: 'enum',
    enum: ReservationStatus,
    default: ReservationStatus.ACTIVE,
  })
  status: ReservationStatus;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt: Date | null;

  @Column({ name: 'reserved_by', nullable: true })
  reservedBy: string | null;

  @Column({ name: 'released_at', type: 'timestamptz', nullable: true })
  releasedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
