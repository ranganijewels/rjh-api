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

export enum ItemStatus {
  AVAILABLE = 'available',
  RESERVED = 'reserved',
  SOLD = 'sold',
  DAMAGED = 'damaged',
  LOST = 'lost',
  IN_TRANSIT = 'in_transit',
}

export enum ItemType {
  FINISHED_JEWELLERY = 'finished_jewellery',
  RAW_MATERIAL = 'raw_material',
  PACKAGING = 'packaging',
  CONSUMABLE = 'consumable',
}

@Entity('jeos_inventory_items')
export class InventoryItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'item_code', unique: true, nullable: true })
  itemCode: string | null;

  @Column({ nullable: true })
  barcode: string | null;

  @Column({ name: 'qr_code', nullable: true })
  qrCode: string | null;

  @Column({ name: 'product_id', nullable: true })
  productId: string | null;

  @Column({ name: 'product_name', nullable: true })
  productName: string;

  @Column({ name: 'product_code', nullable: true })
  productCode: string;

  @Column({ name: 'design_id', nullable: true })
  designId: string | null;

  @Column({ name: 'design_name', nullable: true })
  designName: string | null;

  @Column({ name: 'design_code', nullable: true })
  designCode: string | null;

  @Column({ name: 'metal_type', nullable: true })
  metalType: string | null;

  @Column({ name: 'metal_purity', nullable: true })
  metalPurity: string | null;

  @Column({ name: 'metal_color', nullable: true })
  metalColor: string | null;

  @Column({
    name: 'gross_weight_g',
    type: 'numeric',
    precision: 10,
    scale: 3,
    nullable: true,
  })
  grossWeightG: number | null;

  @Column({
    name: 'net_weight_g',
    type: 'numeric',
    precision: 10,
    scale: 3,
    nullable: true,
  })
  netWeightG: number | null;

  @Column({
    name: 'diamond_weight_ct',
    type: 'numeric',
    precision: 10,
    scale: 3,
    nullable: true,
  })
  diamondWeightCt: number | null;

  @Column({ name: 'diamond_shape', nullable: true })
  diamondShape: string | null;

  @Column({ name: 'diamond_quality', nullable: true })
  diamondQuality: string | null;

  @Column({ name: 'product_size', nullable: true })
  productSize: string | null;

  @Column({ name: 'current_location_id', nullable: true })
  currentLocationId: string | null;

  @ManyToOne(() => InventoryLocation, { nullable: true })
  @JoinColumn({ name: 'current_location_id' })
  currentLocation: InventoryLocation | null;

  @Column({
    name: 'current_quantity',
    type: 'numeric',
    default: 0,
  })
  currentQuantity: number;

  @Column({
    name: 'reserved_quantity',
    type: 'numeric',
    default: 0,
  })
  reservedQuantity: number;

  @Column({
    name: 'available_quantity',
    type: 'numeric',
    default: 0,
  })
  availableQuantity: number;

  @Column({
    name: 'item_status',
    type: 'enum',
    enum: ItemStatus,
    default: ItemStatus.AVAILABLE,
  })
  itemStatus: ItemStatus;

  @Column({
    name: 'item_type',
    type: 'enum',
    enum: ItemType,
    default: ItemType.FINISHED_JEWELLERY,
  })
  itemType: ItemType;

  @Column({ name: 'main_image_url', type: 'text', nullable: true })
  mainImageUrl: string | null;

  @Column({
    name: 'purchase_price',
    type: 'numeric',
    precision: 14,
    scale: 2,
    nullable: true,
  })
  purchasePrice: number | null;

  @Column({
    type: 'numeric',
    precision: 14,
    scale: 2,
    nullable: true,
  })
  mrp: number | null;

  @Column({ name: 'created_by', nullable: true })
  createdBy: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @Column({ name: 'is_deleted', default: false })
  isDeleted: boolean;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, unknown>;
}
