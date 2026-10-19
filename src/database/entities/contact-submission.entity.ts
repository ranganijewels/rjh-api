import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm'

@Entity('contact_submissions')
export class ContactSubmission {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'varchar' })
  tenantId: string

  @Column({ type: 'varchar' })
  name: string

  @Column({ type: 'varchar', nullable: true })
  email: string | null

  @Column({ type: 'varchar', nullable: true })
  phone: string | null

  @Column({ type: 'varchar', nullable: true })
  subject: string | null

  @Column({ type: 'text' })
  message: string

  @Column({ type: 'varchar', default: 'new' })
  status: 'new' | 'read' | 'responded' | 'closed' | 'spam'

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
