import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum SupplierType {
  DIAMOND_SUPPLIER = 'diamond_supplier',
  METAL_SUPPLIER = 'metal_supplier',
  JEWELLERY_SUPPLIER = 'jewellery_supplier',
  PACKAGING_SUPPLIER = 'packaging_supplier',
  SERVICE_SUPPLIER = 'service_supplier',
  OTHER = 'other',
}

export enum SupplierStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  BLACKLISTED = 'blacklisted',
}

@Entity('jeos_suppliers')
export class Supplier {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'supplier_code', unique: true, nullable: true })
  supplierCode: string;

  @Column({ name: 'supplier_name' })
  supplierName: string;

  @Column({
    name: 'supplier_type',
    type: 'enum',
    enum: SupplierType,
    default: SupplierType.OTHER,
  })
  supplierType: SupplierType;

  @Column({ name: 'contact_person', nullable: true })
  contactPerson: string | null;

  @Column({ nullable: true })
  phone: string | null;

  @Column({ nullable: true })
  email: string | null;

  @Column({ nullable: true })
  country: string | null;

  @Column({ nullable: true })
  state: string | null;

  @Column({ nullable: true })
  city: string | null;

  @Column({ nullable: true })
  address: string | null;

  @Column({ name: 'gst_number', nullable: true })
  gstNumber: string | null;

  @Column({ name: 'pan_number', nullable: true })
  panNumber: string | null;

  @Column({ nullable: true })
  website: string | null;

  @Column({ name: 'payment_terms_days', type: 'int', default: 0 })
  paymentTermsDays: number;

  @Column({
    name: 'credit_limit',
    type: 'numeric',
    precision: 14,
    scale: 2,
    default: 0,
  })
  creditLimit: number;

  @Column({
    type: 'enum',
    enum: SupplierStatus,
    default: SupplierStatus.ACTIVE,
  })
  status: SupplierStatus;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'created_by', nullable: true })
  createdBy: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @Column({ name: 'is_deleted', default: false })
  isDeleted: boolean;
}
