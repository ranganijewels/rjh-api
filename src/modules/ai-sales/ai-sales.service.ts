import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { ConfigService } from '@nestjs/config'
import axios from 'axios'
import {
  AiSalesLead,
  AiLeadTemperature,
  AiLeadStatus,
} from '../../database/entities/ai-sales-lead.entity'
import { AiSalesMessage } from '../../database/entities/ai-sales-message.entity'
import {
  AiSalesAgentSettings,
  AiAgentName,
} from '../../database/entities/ai-sales-agent-settings.entity'
import { PaginationDto, paginate, getSkip } from '../../common/dto/pagination.dto'

@Injectable()
export class AiSalesService {
  constructor(
    @InjectRepository(AiSalesLead)
    private readonly leadRepo: Repository<AiSalesLead>,

    @InjectRepository(AiSalesMessage)
    private readonly messageRepo: Repository<AiSalesMessage>,

    @InjectRepository(AiSalesAgentSettings)
    private readonly settingsRepo: Repository<AiSalesAgentSettings>,

    private readonly configService: ConfigService,
  ) {}

  // ─── Leads ────────────────────────────────────────────────────────────────

  async getLeads(
    tenantId: string,
    dto: PaginationDto & { status?: AiLeadStatus; temperature?: AiLeadTemperature },
  ) {
    const qb = this.leadRepo
      .createQueryBuilder('lead')
      .where('lead.tenantId = :tenantId', { tenantId })

    if (dto.status) {
      qb.andWhere('lead.status = :status', { status: dto.status })
    }

    if (dto.temperature) {
      qb.andWhere('lead.leadTemperature = :temperature', { temperature: dto.temperature })
    }

    if (dto.search) {
      qb.andWhere(
        '(lead.customerName ILIKE :search OR lead.phone ILIKE :search OR lead.email ILIKE :search)',
        { search: `%${dto.search}%` },
      )
    }

    qb.orderBy(`lead.${dto.sortBy || 'createdAt'}`, dto.sortDir === 'asc' ? 'ASC' : 'DESC')
      .skip(getSkip(dto))
      .take(dto.limit || 20)

    const [data, total] = await qb.getManyAndCount()
    return paginate(data, total, dto)
  }

  async getLead(tenantId: string, id: string): Promise<AiSalesLead> {
    const lead = await this.leadRepo.findOne({
      where: { id, tenantId },
      relations: ['messages'],
    })
    if (!lead) throw new NotFoundException('AI sales lead not found')
    return lead
  }

  async createLead(tenantId: string, dto: Partial<AiSalesLead>): Promise<AiSalesLead> {
    const lead = this.leadRepo.create({
      ...dto,
      tenantId,
      status: AiLeadStatus.NEW,
    })
    const saved = await this.leadRepo.save(lead)

    // Trigger lead_extractor agent asynchronously
    this.triggerLeadExtractor(tenantId, saved).catch(() => {
      // silent fail — agent is optional
    })

    return saved
  }

  private async triggerLeadExtractor(tenantId: string, lead: AiSalesLead): Promise<void> {
    const settings = await this.settingsRepo.findOne({
      where: { tenantId, agentName: AiAgentName.LEAD_EXTRACTOR },
    })
    if (!settings || !settings.isEnabled) return

    const systemPrompt =
      settings.systemPrompt ||
      'You are a lead extractor agent for a jewellery store. Extract key customer intent from the conversation.'

    const userContent = `New lead received:
Name: ${lead.customerName}
Phone: ${lead.phone || 'N/A'}
Platform: ${lead.platform}
Notes: ${lead.notes || 'N/A'}`

    const response = await this.callAiAgent(
      AiAgentName.LEAD_EXTRACTOR,
      systemPrompt,
      [{ role: 'user', content: userContent }],
      settings,
    )

    await this.messageRepo.save(
      this.messageRepo.create({
        leadId: lead.id,
        role: 'assistant' as any,
        agentName: AiAgentName.LEAD_EXTRACTOR,
        content: response,
      }),
    )
  }

  async processMessage(
    tenantId: string,
    leadId: string,
    userMessage: string,
    userId?: string,
  ): Promise<{ response: string; agentName: string }> {
    const lead = await this.getLead(tenantId, leadId)

    // Save user message
    await this.messageRepo.save(
      this.messageRepo.create({
        leadId,
        role: 'user' as any,
        content: userMessage,
      }),
    )

    // Pick the appropriate agent based on lead state
    const agentName = this.pickAgent(lead)

    const settings = await this.settingsRepo.findOne({
      where: { tenantId, agentName },
    })

    const systemPrompt =
      settings?.systemPrompt ||
      `You are a helpful ${agentName.replace('_', ' ')} agent for a jewellery store called RJ House.`

    // Build message history
    const messages = lead.messages.map((m) => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content,
    }))
    messages.push({ role: 'user', content: userMessage })

    const response = await this.callAiAgent(agentName, systemPrompt, messages, settings)

    // Save assistant response
    await this.messageRepo.save(
      this.messageRepo.create({
        leadId,
        role: 'assistant' as any,
        agentName,
        content: response,
      }),
    )

    // Update temperature
    lead.leadTemperature = this.scoreTemperature(lead) as AiLeadTemperature
    if (lead.status === AiLeadStatus.NEW) lead.status = AiLeadStatus.ACTIVE
    await this.leadRepo.save(lead)

    return { response, agentName }
  }

  private pickAgent(lead: AiSalesLead): AiAgentName {
    if (lead.humanHandoffRequired) return AiAgentName.HUMAN_HANDOFF
    if (!lead.budget || !lead.productType) return AiAgentName.LEAD_EXTRACTOR
    if (lead.stylePreference || lead.occasion) return AiAgentName.STYLE_CONSULTANT
    return AiAgentName.SALES_MANAGER
  }

  // ─── Agent Settings ───────────────────────────────────────────────────────

  async getAgentSettings(tenantId: string): Promise<AiSalesAgentSettings[]> {
    return this.settingsRepo.find({ where: { tenantId } })
  }

  async updateAgentSettings(
    tenantId: string,
    agentName: AiAgentName,
    dto: Partial<AiSalesAgentSettings>,
    userId: string,
  ): Promise<AiSalesAgentSettings> {
    let settings = await this.settingsRepo.findOne({ where: { tenantId, agentName } })

    if (!settings) {
      settings = this.settingsRepo.create({ tenantId, agentName })
    }

    Object.assign(settings, dto, { updatedBy: userId })
    return this.settingsRepo.save(settings)
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  scoreTemperature(lead: AiSalesLead): string {
    const urgency = (lead.urgency || '').toLowerCase()
    if (urgency.includes('urgent') || urgency.includes('asap')) return 'very_hot'
    if (lead.budget && lead.productType) return 'hot'
    if (lead.occasion || lead.stylePreference || lead.metalTone || lead.country) return 'warm'
    return 'cold'
  }

  private async callAiAgent(
    agentName: AiAgentName | string,
    systemPrompt: string,
    messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
    settings?: AiSalesAgentSettings | null,
  ): Promise<string> {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY')
    if (!apiKey) {
      return 'AI agent not configured. Please set OPENAI_API_KEY.'
    }

    try {
      const payload = {
        model: 'gpt-4o-mini',
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        temperature: settings?.temperature ?? 0.7,
        max_tokens: settings?.maxTokens ?? 1000,
      }

      const resp = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        payload,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        },
      )

      return resp.data.choices?.[0]?.message?.content ?? ''
    } catch (err: any) {
      return `AI agent error: ${err?.response?.data?.error?.message || err.message}`
    }
  }
}
