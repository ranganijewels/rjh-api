import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm'
import { AiSalesLead } from './ai-sales-lead.entity'

export enum AiMessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system',
}

@Entity('ai_sales_messages')
export class AiSalesMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'uuid' })
  leadId: string

  @ManyToOne(() => AiSalesLead, (lead) => lead.messages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'leadId' })
  lead: AiSalesLead

  @Column({
    type: 'enum',
    enum: AiMessageRole,
  })
  role: AiMessageRole

  @Column({ type: 'text' })
  content: string

  @Column({ type: 'varchar', nullable: true })
  agentName: string | null

  @Column({ type: 'int', nullable: true })
  tokensUsed: number | null

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date
}
