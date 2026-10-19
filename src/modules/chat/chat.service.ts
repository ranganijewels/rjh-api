import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { MoreThan, Repository } from 'typeorm'
import { ChatConversation } from '../../database/entities/chat-conversation.entity'
import { ChatMessage } from '../../database/entities/chat-message.entity'

const GREETING =
  "Hi! Welcome to RJ House ✨ How can we help you find the perfect piece today?"

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatConversation)
    private readonly conversations: Repository<ChatConversation>,
    @InjectRepository(ChatMessage)
    private readonly messages: Repository<ChatMessage>,
  ) {}

  // ─── Storefront (visitor) ──────────────────────────────────────────────

  // Start a brand-new conversation. Seeds an automated greeting so the panel
  // never opens empty, plus the visitor's first message if they typed one.
  async start(
    tenantId: string,
    dto: { visitorName?: string; visitorEmail?: string; customerId?: string; message?: string },
  ) {
    const convo = await this.conversations.save(
      this.conversations.create({
        tenantId,
        visitorName: dto.visitorName?.trim() || null,
        visitorEmail: dto.visitorEmail?.trim() || null,
        customerId: dto.customerId || null,
        status: 'open',
        unreadForAdmin: 0,
        unreadForVisitor: 0,
        lastMessageAt: new Date(),
      }),
    )

    await this.addMessage(convo, 'system', 'RJ House', GREETING)
    if (dto.message?.trim()) {
      await this.addMessage(convo, 'visitor', dto.visitorName || 'Visitor', dto.message.trim())
    }

    return this.getWithMessages(tenantId, convo.id, 'visitor')
  }

  // Visitor posts a message into an existing conversation.
  async visitorSend(tenantId: string, conversationId: string, content: string, name?: string) {
    const convo = await this.findConvo(tenantId, conversationId)
    if (convo.status === 'closed') {
      convo.status = 'open' // re-open if the visitor comes back
    }
    const msg = await this.addMessage(convo, 'visitor', name || convo.visitorName || 'Visitor', content)
    return msg
  }

  // ─── Admin (agent) ─────────────────────────────────────────────────────

  list(tenantId: string, status?: string) {
    const where: any = { tenantId }
    if (status && status !== 'all') where.status = status
    return this.conversations.find({ where, order: { lastMessageAt: 'DESC' } })
  }

  // Agent reply.
  async agentSend(tenantId: string, conversationId: string, content: string, agentName?: string) {
    const convo = await this.findConvo(tenantId, conversationId)
    const msg = await this.addMessage(convo, 'agent', agentName || 'RJ House', content)
    // Reading + replying clears the admin's own unread badge.
    convo.unreadForAdmin = 0
    await this.conversations.save(convo)
    return msg
  }

  async setStatus(tenantId: string, conversationId: string, status: 'open' | 'closed') {
    const convo = await this.findConvo(tenantId, conversationId)
    convo.status = status
    return this.conversations.save(convo)
  }

  // ─── Shared ────────────────────────────────────────────────────────────

  // Fetch a conversation with its messages. `viewer` decides which unread
  // counter gets reset (the side that's currently looking).
  async getWithMessages(
    tenantId: string,
    conversationId: string,
    viewer: 'visitor' | 'admin',
    after?: string,
  ) {
    const convo = await this.findConvo(tenantId, conversationId)

    const where: any = { conversationId }
    if (after) {
      const ts = new Date(after)
      if (!isNaN(ts.getTime())) where.createdAt = MoreThan(ts)
    }
    const messages = await this.messages.find({ where, order: { createdAt: 'ASC' } })

    // Opening the thread marks it read for that side.
    if (!after) {
      if (viewer === 'visitor' && convo.unreadForVisitor !== 0) {
        convo.unreadForVisitor = 0
        await this.conversations.save(convo)
      } else if (viewer === 'admin' && convo.unreadForAdmin !== 0) {
        convo.unreadForAdmin = 0
        await this.conversations.save(convo)
      }
    }

    return { conversation: convo, messages }
  }

  private async findConvo(tenantId: string, id: string) {
    const convo = await this.conversations.findOne({ where: { id, tenantId } })
    if (!convo) throw new NotFoundException('Conversation not found')
    return convo
  }

  private async addMessage(
    convo: ChatConversation,
    sender: 'visitor' | 'agent' | 'system',
    senderName: string,
    content: string,
  ) {
    const msg = await this.messages.save(
      this.messages.create({ conversationId: convo.id, sender, senderName, content }),
    )
    convo.lastMessagePreview = content.slice(0, 140)
    convo.lastMessageAt = msg.createdAt
    if (sender === 'visitor') convo.unreadForAdmin += 1
    if (sender === 'agent') convo.unreadForVisitor += 1
    await this.conversations.save(convo)
    return msg
  }
}
