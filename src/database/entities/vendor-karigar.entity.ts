import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum VendorType {
  KARIGAR = 'karigar',
  CASTING_VENDOR = 'casting_vendor',
  SETTING_VENDOR = 'setting_vendor',
  POLISHING_VENDOR = 'polishing_vendor',
  PLATING_VENDOR = 'plating_vendor',
  CAD_VENDOR = 'cad_vendor',
  PACKAGING_VENDOR = 'packaging_vendor',
  LOGISTICS_VENDOR = 'logistics_vendor',
  OTHER = 'other',
}

export enum VendorStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  BLACKLISTED = 'blacklisted',
}

@Entity('jeos_vendors_karigars')
export class VendorKarigar {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'vendor_code', unique: true, nullable: true })
  vendorCode: string;

  @Column({ name: 'vendor_name' })
  vendorName: string;

  @Column({
    name: 'vendor_type',
    type: 'enum',
    enum: VendorType,
    default: VendorType.OTHER,
  })
  vendorType: VendorType;

  @Column({ name: 'contact_person', nullable: true })
  contactPerson: string | null;

  @Column({ nullable: true })
  phone: string | null;

  @Column({ nullable: true })
  email: string | null;

  @Column({ nullable: true })
  city: string | null;

  @Column({ nullable: true })
  address: string | null;

  @Column({ name: 'skill_speciality', nullable: true })
  skillSpeciality: string | null;

  @Column({ name: 'payment_terms_days', type: 'int', default: 0 })
  paymentTermsDays: number;

  @Column({
    name: 'quality_rating',
    type: 'numeric',
    precision: 4,
    scale: 2,
    nullable: true,
  })
  qualityRating: number | null;

  @Column({
    name: 'on_time_rating',
    type: 'numeric',
    precision: 4,
    scale: 2,
    nullable: true,
  })
  onTimeRating: number | null;

  @Column({
    type: 'enum',
    enum: VendorStatus,
    default: VendorStatus.ACTIVE,
  })
  status: VendorStatus;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'created_by', nullable: true })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @Column({ name: 'is_deleted', default: false })
  isDeleted: boolean;
}
