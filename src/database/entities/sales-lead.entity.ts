import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm'
import { SalesFollowUp } from './sales-follow-up.entity'

export enum SalesLeadStage {
  NEW = 'new',
  CONTACTED = 'contacted',
  QUALIFIED = 'qualified',
  PROPOSAL = 'proposal',
  NEGOTIATION = 'negotiation',
  WON = 'won',
  LOST = 'lost',
}

@Entity('jeos_sales_leads')
export class SalesLead {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'varchar' })
  tenantId: string

  @Column({ type: 'varchar' })
  leadName: string

  @Column({ type: 'varchar', nullable: true })
  phone: string | null

  @Column({ type: 'varchar', nullable: true })
  email: string | null

  @Column({ type: 'varchar', nullable: true })
  source: string | null

  @Column({
    type: 'enum',
    enum: SalesLeadStage,
    default: SalesLeadStage.NEW,
  })
  stage: SalesLeadStage

  @Column({ type: 'varchar', nullable: true })
  assignedTo: string | null

  @Column({
    type: 'numeric',
    precision: 14,
    scale: 2,
    nullable: true,
  })
  estimatedValue: number | null

  @Column({ type: 'date', nullable: true })
  expectedCloseDate: Date | null

  @Column({ type: 'text', nullable: true })
  notes: string | null

  @Column({ type: 'jsonb', default: [] })
  tags: string[]

  @Column({ type: 'varchar', nullable: true })
  createdBy: string | null

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date

  @Column({ type: 'boolean', default: false })
  isDeleted: boolean

  @OneToMany(() => SalesFollowUp, (followUp) => followUp.lead)
  followUps: SalesFollowUp[]
}
