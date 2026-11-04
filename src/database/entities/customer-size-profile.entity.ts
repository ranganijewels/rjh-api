import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, ManyToOne, JoinColumn, Index,
} from 'typeorm'
import { User } from './user.entity'

// Saved sizes a shopper reuses at checkout ("Me", "My partner", …). Values
// are the storefront's size labels (e.g. "7", '18"'), kept as text.
@Entity('customer_size_profiles')
export class CustomerSizeProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'user_id' })
  @Index()
  userId: string

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User

  @Column({ name: 'tenant_id', nullable: true })
  tenantId: string

  @Column({ length: 100 })
  name: string

  @Column({ name: 'ring_size', length: 20, nullable: true })
  ringSize: string | null

  @Column({ name: 'wedding_band_size', length: 20, nullable: true })
  weddingBandSize: string | null

  @Column({ name: 'bracelet_size', length: 20, nullable: true })
  braceletSize: string | null

  @Column({ name: 'necklace_length', length: 20, nullable: true })
  necklaceLength: string | null

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date
}
