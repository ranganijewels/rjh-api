import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm'

@Entity('custom_requests')
export class CustomRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'varchar' })
  tenantId: string

  @Column({ type: 'varchar', nullable: true })
  customerId: string | null

  @Column({ type: 'varchar' })
  name: string

  @Column({ type: 'varchar', nullable: true })
  email: string | null

  @Column({ type: 'varchar', nullable: true })
  phone: string | null

  @Column({ type: 'varchar', nullable: true })
  jewelryType: string | null

  @Column({ type: 'varchar', nullable: true })
  metal: string | null

  @Column({ type: 'varchar', nullable: true })
  stone: string | null

  @Column({ type: 'varchar', nullable: true })
  budget: string | null

  @Column({ type: 'text', nullable: true })
  description: string | null

  @Column({ type: 'jsonb', nullable: true })
  referenceImages: any

  @Column({ type: 'varchar', default: 'new' })
  status: 'new' | 'reviewing' | 'in_progress' | 'completed' | 'declined'

  @Column({ type: 'text', nullable: true })
  internalNotes: string | null

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date

  // Campaign attribution (UTMs, referrer, click ids) + consented Meta match keys.
  @Column({ type: 'jsonb', nullable: true })
  marketing: Record<string, any> | null
}
