import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { InventoryItem } from './inventory-item.entity';

export enum CodeType {
  BARCODE = 'barcode',
  QR_CODE = 'qr_code',
}

@Entity('jeos_barcode_qr_records')
export class BarcodeQrRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({
    name: 'code_type',
    type: 'enum',
    enum: CodeType,
  })
  codeType: CodeType;

  @Column({ name: 'code_value', unique: true })
  codeValue: string;

  @Column({ name: 'item_id', nullable: true })
  itemId: string | null;

  @ManyToOne(() => InventoryItem, { nullable: true })
  @JoinColumn({ name: 'item_id' })
  item: InventoryItem | null;

  @Column({ name: 'generated_by', nullable: true })
  generatedBy: string | null;

  @Column({ name: 'printed_at', type: 'timestamptz', nullable: true })
  printedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
