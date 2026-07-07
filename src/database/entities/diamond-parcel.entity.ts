import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, ManyToOne, JoinColumn, Index,
} from 'typeorm'
import { Supplier } from './supplier.entity'

export enum ParcelStatus {
  AVAILABLE = 'available',
  SOLD = 'sold',
  RETURNED = 'returned',
}

@Entity('diamond_parcels')
@Index(['tenantId', 'status'])
@Index(['parcelCode'])
export class DiamondParcel {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'tenant_id' })
  tenantId: string

  @Column({ name: 'parcel_code', unique: true, nullable: true })
  parcelCode: string

  @Column({ name: 'supplier_id', nullable: true })
  supplierId: string

  @ManyToOne(() => Supplier, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'supplier_id' })
  supplier: Supplier

  @Column({ name: 'total_carats', type: 'numeric', precision: 10, scale: 3 })
  totalCarats: number

  @Column({ name: 'total_pieces', type: 'int' })
  totalPieces: number

  @Column({ name: 'average_color' })
  averageColor: string

  @Column({ name: 'average_clarity' })
  averageClarity: string

  @Column({ name: 'price_per_carat', type: 'numeric', precision: 14, scale: 2 })
  pricePerCarat: number

  @Column({ name: 'total_amount', type: 'numeric', precision: 14, scale: 2 })
  totalAmount: number

  @Column({
    type: 'enum',
    enum: ParcelStatus,
    default: ParcelStatus.AVAILABLE,
  })
  status: ParcelStatus

  @Column({ type: 'text', nullable: true })
  notes: string

  @Column({ name: 'created_by', nullable: true })
  createdBy: string

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date
}
