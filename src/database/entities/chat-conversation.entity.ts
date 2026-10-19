import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm'

// A live-chat conversation between a storefront visitor and a store agent.
// Messages live in chat_messages, linked by conversationId.
@Entity('chat_conversations')
export class ChatConversation {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Index()
  @Column({ type: 'varchar' })
  tenantId: string

  @Column({ type: 'varchar', nullable: true })
  visitorName: string | null

  @Column({ type: 'varchar', nullable: true })
  visitorEmail: string | null

  // Set when an authenticated customer starts/continues the chat.
  @Column({ type: 'uuid', nullable: true })
  customerId: string | null

  @Column({ type: 'varchar', default: 'open' })
  status: 'open' | 'closed'

  // Short preview of the most recent message, for the admin inbox list.
  @Column({ type: 'text', nullable: true })
  lastMessagePreview: string | null

  @Column({ type: 'timestamptz', nullable: true })
  lastMessageAt: Date | null

  // Unread counters drive the badges on each side.
  @Column({ type: 'int', default: 0 })
  unreadForAdmin: number

  @Column({ type: 'int', default: 0 })
  unreadForVisitor: number

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date
}
