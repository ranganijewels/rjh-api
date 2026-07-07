import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm'

@Entity('coupons')
@Index(['tenantId', 'code'], { unique: true })
export class Coupon {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'varchar' })
  tenantId: string

  @Column({ type: 'varchar' })
  code: string

  @Column({ type: 'text', nullable: true })
  description: string | null

  @Column({ type: 'varchar', default: 'percent' })
  discountType: 'percent' | 'fixed'

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  discountValue: number

  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true })
  minOrderValue: number | null

  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true })
  maxDiscount: number | null

  @Column({ type: 'int', nullable: true })
  maxUses: number | null

  @Column({ type: 'int', default: 0 })
  usedCount: number

  @Column({ type: 'int', nullable: true })
  maxUsesPerUser: number | null

  @Column({ type: 'timestamptz', nullable: true })
  startsAt: Date | null

  @Column({ type: 'timestamptz', nullable: true })
  expiresAt: Date | null

  @Column({ type: 'boolean', default: true })
  isActive: boolean

  @Column({ type: 'varchar', nullable: true })
  createdBy: string | null

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date
}
