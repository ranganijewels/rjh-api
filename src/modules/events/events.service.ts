import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { DomainEvent } from '../../database/entities/domain-event.entity'

export interface EmitEventInput {
  aggregateType: string
  aggregateId: string
  eventType: string
  payload?: Record<string, any>
  source?: string
}

export interface ListEventsQuery {
  status?: string
  aggregateType?: string
  limit?: number
}

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(DomainEvent)
    private readonly repo: Repository<DomainEvent>,
  ) {}

  async emit(tenantId: string, input: EmitEventInput, userId?: string) {
    const event = this.repo.create({
      tenantId,
      aggregateType: input.aggregateType,
      aggregateId: input.aggregateId,
      eventType: input.eventType,
      payload: input.payload ?? {},
      source: input.source ?? null,
      status: 'pending',
      processedAt: null,
      createdBy: userId,
    })
    return this.repo.save(event)
  }

  list(tenantId: string, query: ListEventsQuery = {}) {
    const where: Record<string, any> = { tenantId }
    if (query.status) where.status = query.status
    if (query.aggregateType) where.aggregateType = query.aggregateType

    const limit = Number(query.limit) > 0 ? Number(query.limit) : 100

    return this.repo.find({
      where,
      order: { createdAt: 'DESC' },
      take: limit,
    })
  }

  async get(tenantId: string, id: string) {
    const event = await this.repo.findOne({ where: { id, tenantId } })
    if (!event) throw new NotFoundException('Event not found')
    return event
  }

  async markProcessed(tenantId: string, id: string) {
    const event = await this.get(tenantId, id)
    event.status = 'processed'
    event.processedAt = new Date()
    return this.repo.save(event)
  }

  async replay(tenantId: string, id: string) {
    const event = await this.get(tenantId, id)
    event.status = 'pending'
    event.processedAt = null
    return this.repo.save(event)
  }

  async remove(tenantId: string, id: string) {
    const event = await this.get(tenantId, id)
    await this.repo.remove(event)
    return { success: true }
  }
}
