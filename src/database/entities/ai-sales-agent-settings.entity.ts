import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm'

export enum AiAgentName {
  LEAD_EXTRACTOR = 'lead_extractor',
  STYLE_CONSULTANT = 'style_consultant',
  PRICE_TRUST = 'price_trust',
  FOLLOW_UP = 'follow_up',
  HUMAN_HANDOFF = 'human_handoff',
  SALES_MANAGER = 'sales_manager',
}

@Entity('ai_sales_agent_settings')
export class AiSalesAgentSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'varchar' })
  tenantId: string

  @Column({
    type: 'enum',
    enum: AiAgentName,
  })
  agentName: AiAgentName

  @Column({ type: 'boolean', default: true })
  isEnabled: boolean

  @Column({ type: 'text', nullable: true })
  systemPrompt: string | null

  @Column({
    type: 'numeric',
    precision: 4,
    scale: 2,
    default: 0.7,
  })
  temperature: number

  @Column({ type: 'int', default: 1000 })
  maxTokens: number

  @Column({ type: 'jsonb', default: {} })
  settings: Record<string, unknown>

  @Column({ type: 'varchar', nullable: true })
  updatedBy: string | null

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date
}
