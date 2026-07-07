import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm'
import { SalesLead, SalesLeadStage } from '../../database/entities/sales-lead.entity'
import { SalesFollowUp, FollowUpStatus } from '../../database/entities/sales-follow-up.entity'
import { PaginationDto, paginate } from '../../common/dto/pagination.dto'

@Injectable()
export class SalesService {
  constructor(
    @InjectRepository(SalesLead)
    private readonly leadRepo: Repository<SalesLead>,

    @InjectRepository(SalesFollowUp)
    private readonly followUpRepo: Repository<SalesFollowUp>,
  ) {}

  // ─── Leads ────────────────────────────────────────────────────────────────

  async getLeads(
    tenantId: string,
    dto: PaginationDto & { stage?: SalesLeadStage },
  ) {
    const qb = this.leadRepo
      .createQueryBuilder('lead')
      .where('lead.tenantId = :tenantId', { tenantId })
      .andWhere('lead.isDeleted = false')

    if (dto.stage) {
      qb.andWhere('lead.stage = :stage', { stage: dto.stage })
    }

    if (dto.search) {
      qb.andWhere(
        '(lead.leadName ILIKE :search OR lead.email ILIKE :search OR lead.phone ILIKE :search)',
        { search: `%${dto.search}%` },
      )
    }

    qb.orderBy(`lead.${dto.sortBy || 'createdAt'}`, dto.sortDir === 'asc' ? 'ASC' : 'DESC')
      .skip(dto.skip)
      .take(dto.limit || 20)

    const [data, total] = await qb.getManyAndCount()
    return paginate(data, total, dto)
  }

  async getLead(tenantId: string, id: string): Promise<SalesLead> {
    const lead = await this.leadRepo.findOne({
      where: { id, tenantId, isDeleted: false },
      relations: ['followUps'],
    })
    if (!lead) throw new NotFoundException('Lead not found')
    return lead
  }

  async createLead(
    tenantId: string,
    dto: Partial<SalesLead>,
    userId: string,
  ): Promise<SalesLead> {
    const lead = this.leadRepo.create({
      ...dto,
      tenantId,
      createdBy: userId,
      stage: dto.stage || SalesLeadStage.NEW,
    })
    return this.leadRepo.save(lead)
  }

  async updateLead(
    tenantId: string,
    id: string,
    dto: Partial<SalesLead>,
    userId: string,
  ): Promise<SalesLead> {
    const lead = await this.getLead(tenantId, id)
    Object.assign(lead, dto)
    return this.leadRepo.save(lead)
  }

  // ─── Follow-Ups ───────────────────────────────────────────────────────────

  async getFollowUps(
    tenantId: string,
    dto: PaginationDto & {
      status?: FollowUpStatus
      scheduledFrom?: string
      scheduledTo?: string
    },
  ) {
    const qb = this.followUpRepo
      .createQueryBuilder('fu')
      .where('fu.tenantId = :tenantId', { tenantId })

    if (dto.status) {
      qb.andWhere('fu.status = :status', { status: dto.status })
    }

    if (dto.scheduledFrom) {
      qb.andWhere('fu.scheduledAt >= :from', { from: dto.scheduledFrom })
    }

    if (dto.scheduledTo) {
      qb.andWhere('fu.scheduledAt <= :to', { to: dto.scheduledTo })
    }

    qb.orderBy(`fu.${dto.sortBy || 'scheduledAt'}`, dto.sortDir === 'asc' ? 'ASC' : 'DESC')
      .skip(dto.skip)
      .take(dto.limit || 20)

    const [data, total] = await qb.getManyAndCount()
    return paginate(data, total, dto)
  }

  async createFollowUp(
    tenantId: string,
    dto: Partial<SalesFollowUp>,
    userId: string,
  ): Promise<SalesFollowUp> {
    const followUp = this.followUpRepo.create({
      ...dto,
      tenantId,
      createdBy: userId,
      status: FollowUpStatus.PENDING,
    })
    return this.followUpRepo.save(followUp)
  }

  async completeFollowUp(
    tenantId: string,
    id: string,
    outcome: string,
    nextFollowUpAt: Date | null,
    userId: string,
  ): Promise<SalesFollowUp> {
    const followUp = await this.followUpRepo.findOne({ where: { id, tenantId } })
    if (!followUp) throw new NotFoundException('Follow-up not found')

    followUp.status = FollowUpStatus.COMPLETED
    followUp.outcome = outcome
    followUp.completedAt = new Date()
    followUp.nextFollowUpAt = nextFollowUpAt || null
    return this.followUpRepo.save(followUp)
  }

  async getUpcomingFollowUps(tenantId: string): Promise<SalesFollowUp[]> {
    const now = new Date()
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    return this.followUpRepo.find({
      where: {
        tenantId,
        status: FollowUpStatus.PENDING,
        scheduledAt: Between(now, in24h),
      },
      order: { scheduledAt: 'ASC' },
    })
  }

  // ─── Message Templates ────────────────────────────────────────────────────

  async getTemplates(tenantId: string) {
    return {
      data: [
        { id: 'tpl-1', name: 'Initial Enquiry Response', type: 'whatsapp', body: 'Hi {{name}}, thank you for your interest in RJ House! Our team will get back to you shortly.' },
        { id: 'tpl-2', name: 'Follow-Up 24h', type: 'whatsapp', body: 'Hi {{name}}, just checking in about the jewellery you were interested in. Would you like to schedule a visit?' },
        { id: 'tpl-3', name: 'Quotation Sent', type: 'email', body: 'Dear {{name}}, please find attached your quotation for {{product}}. Valid for 7 days.' },
        { id: 'tpl-4', name: 'Order Confirmation', type: 'whatsapp', body: 'Your order {{orderNumber}} has been confirmed! Expected delivery: {{deliveryDate}}.' },
      ],
      total: 4,
    }
  }

  async createTemplate(tenantId: string, dto: Record<string, any>, userId: string) {
    return { ...dto, id: `tpl-${Date.now()}`, tenantId, createdBy: userId, createdAt: new Date().toISOString() }
  }
}
