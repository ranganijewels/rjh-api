import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm'

@Entity('jeos_reviews')
@Index(['tenantId'])
export class Review {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'tenant_id' })
  tenantId: string

  @Column({ name: 'product_id' })
  productId: string

  @Column({ name: 'customer_name', nullable: true })
  customerName: string

  @Column({ nullable: true })
  email: string

  @Column({ type: 'int', default: 5 })
  rating: number

  @Column({ nullable: true })
  title: string

  @Column({ type: 'text', nullable: true })
  body: string

  @Column({ default: 'pending' })
  status: string

  @Column({ name: 'is_verified_purchase', default: false })
  isVerifiedPurchase: boolean

  @Column({ name: 'created_by', nullable: true })
  createdBy: string

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date
}
