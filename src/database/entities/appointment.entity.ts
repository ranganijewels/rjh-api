import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm'

@Entity('appointments')
export class Appointment {
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

  @Column({ type: 'date', nullable: true })
  preferredDate: Date | null

  @Column({ type: 'varchar', nullable: true })
  preferredTime: string | null

  @Column({ type: 'varchar', default: 'in_store' })
  location: 'in_store' | 'virtual' | 'home_visit'

  @Column({ type: 'text', nullable: true })
  notes: string | null

  @Column({ type: 'varchar', default: 'pending' })
  status: 'pending' | 'confirmed' | 'rescheduled' | 'completed' | 'cancelled' | 'no_show'

  @Column({ type: 'varchar', nullable: true })
  assignedTo: string | null

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date

  // Campaign attribution (UTMs, referrer, click ids) + consented Meta match keys.
  @Column({ type: 'jsonb', nullable: true })
  marketing: Record<string, any> | null
}
