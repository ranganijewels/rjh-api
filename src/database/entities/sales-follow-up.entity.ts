import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm'
import { SalesLead } from './sales-lead.entity'

export enum FollowUpType {
  CALL = 'call',
  WHATSAPP = 'whatsapp',
  EMAIL = 'email',
  VISIT = 'visit',
  OTHER = 'other',
}

export enum FollowUpStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  RESCHEDULED = 'rescheduled',
}

@Entity('jeos_sales_follow_ups')
export class SalesFollowUp {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'varchar' })
  tenantId: string

  @Column({ type: 'uuid', nullable: true })
  leadId: string | null

  @ManyToOne(() => SalesLead, (lead) => lead.followUps, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'leadId' })
  lead: SalesLead | null

  @Column({ type: 'varchar', nullable: true })
  customerId: string | null

  @Column({ type: 'varchar' })
  subject: string

  @Column({ type: 'timestamptz' })
  scheduledAt: Date

  @Column({ type: 'timestamptz', nullable: true })
  completedAt: Date | null

  @Column({
    type: 'enum',
    enum: FollowUpType,
    default: FollowUpType.CALL,
  })
  followUpType: FollowUpType

  @Column({
    type: 'enum',
    enum: FollowUpStatus,
    default: FollowUpStatus.PENDING,
  })
  status: FollowUpStatus

  @Column({ type: 'text', nullable: true })
  notes: string | null

  @Column({ type: 'text', nullable: true })
  outcome: string | null

  @Column({ type: 'timestamptz', nullable: true })
  nextFollowUpAt: Date | null

  @Column({ type: 'varchar' })
  createdBy: string

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date
}
