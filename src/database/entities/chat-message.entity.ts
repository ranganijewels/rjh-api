import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm'

// A single message inside a live-chat conversation.
@Entity('chat_messages')
export class ChatMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Index()
  @Column({ type: 'uuid' })
  conversationId: string

  // 'visitor' = storefront customer, 'agent' = store staff reply,
  // 'system' = automated greeting / status note.
  @Column({ type: 'varchar' })
  sender: 'visitor' | 'agent' | 'system'

  @Column({ type: 'varchar', nullable: true })
  senderName: string | null

  @Column({ type: 'text' })
  content: string

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date
}
