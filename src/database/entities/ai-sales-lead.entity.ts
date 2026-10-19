import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm'
import { AiSalesMessage } from './ai-sales-message.entity'

export enum AiLeadPlatform {
  WHATSAPP = 'whatsapp',
  WEB = 'web',
  INSTAGRAM = 'instagram',
  FACEBOOK = 'facebook',
  OTHER = 'other',
}

export enum AiLeadTemperature {
  COLD = 'cold',
  WARM = 'warm',
  HOT = 'hot',
  VERY_HOT = 'very_hot',
}

export enum AiLeadStatus {
  NEW = 'new',
  ACTIVE = 'active',
  CONVERTED = 'converted',
  DROPPED = 'dropped',
  PAUSED = 'paused',
}

@Entity('ai_sales_leads')
export class AiSalesLead {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'varchar' })
  tenantId: string

  @Column({ type: 'varchar' })
  customerName: string

  @Column({ type: 'varchar', nullable: true })
  phone: string | null

  @Column({ type: 'varchar', nullable: true })
  email: string | null

  @Column({
    type: 'enum',
    enum: AiLeadPlatform,
  })
  platform: AiLeadPlatform

  @Column({ type: 'varchar', nullable: true })
  productType: string | null

  @Column({ type: 'varchar', nullable: true })
  occasion: string | null

  @Column({ type: 'varchar', nullable: true })
  stylePreference: string | null

  @Column({ type: 'varchar', nullable: true })
  metalTone: string | null

  @Column({ type: 'varchar', nullable: true })
  budget: string | null

  @Column({ type: 'varchar', nullable: true })
  country: string | null

  @Column({ type: 'varchar', nullable: true })
  readyOrCustom: string | null

  @Column({ type: 'varchar', nullable: true })
  urgency: string | null

  @Column({
    type: 'enum',
    enum: AiLeadTemperature,
    nullable: true,
  })
  leadTemperature: AiLeadTemperature | null

  @Column({ type: 'text', nullable: true })
  nextAction: string | null

  @Column({ type: 'boolean', default: false })
  humanHandoffRequired: boolean

  @Column({ type: 'text', nullable: true })
  handoffReason: string | null

  @Column({ type: 'varchar', nullable: true })
  assignedAgent: string | null

  @Column({
    type: 'enum',
    enum: AiLeadStatus,
    default: AiLeadStatus.NEW,
  })
  status: AiLeadStatus

  @Column({ type: 'timestamptz', nullable: true })
  convertedAt: Date | null

  @Column({ type: 'text', nullable: true })
  notes: string | null

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, unknown>

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date

  @OneToMany(() => AiSalesMessage, (message) => message.lead)
  messages: AiSalesMessage[]
}
