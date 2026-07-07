import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Supplier } from './supplier.entity';

export enum SupplierDocumentType {
  GST_CERTIFICATE = 'gst_certificate',
  PAN_CARD = 'pan_card',
  BANK_DETAIL = 'bank_detail',
  AGREEMENT = 'agreement',
  NDA = 'nda',
  PRICE_LIST = 'price_list',
  OTHER = 'other',
}

@Entity('jeos_supplier_documents')
export class SupplierDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'supplier_id' })
  supplierId: string;

  @ManyToOne(() => Supplier, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'supplier_id' })
  supplier: Supplier;

  @Column({
    name: 'document_type',
    type: 'enum',
    enum: SupplierDocumentType,
  })
  documentType: SupplierDocumentType;

  @Column({ name: 'document_name' })
  documentName: string;

  @Column({ name: 'file_url', nullable: true })
  fileUrl: string | null;

  @Column({ name: 'file_path', nullable: true })
  filePath: string | null;

  @Column({ name: 'bucket_name', nullable: true })
  bucketName: string | null;

  @Column({ name: 'expiry_date', type: 'date', nullable: true })
  expiryDate: string | null;

  @Column({ name: 'uploaded_by', nullable: true })
  uploadedBy: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
