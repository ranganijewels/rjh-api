import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Quote, QuoteLine } from '../../database/entities/quote.entity'

@Injectable()
export class QuoteService {
  constructor(
    @InjectRepository(Quote)
    private readonly repo: Repository<Quote>,
  ) {}

  list(tenantId: string, query: any = {}) {
    const where: any = { tenantId }
    if (query?.status) where.status = query.status
    if (query?.accountId) where.accountId = query.accountId
    return this.repo.find({ where, order: { createdAt: 'DESC' } })
  }

  async get(tenantId: string, id: string) {
    const quote = await this.repo.findOne({ where: { id, tenantId } })
    if (!quote) throw new NotFoundException('Quote not found')
    return quote
  }

  /** Count-based human-friendly number, e.g. QT-000123. */
  async generateQuoteNumber(tenantId: string): Promise<string> {
    const count = await this.repo.count({ where: { tenantId } })
    const seq = String(count + 1).padStart(6, '0')
    return `QT-${seq}`
  }

  private computeTotals(lines: QuoteLine[], discount?: number) {
    const list = Array.isArray(lines) ? lines : []
    const subtotal = list.reduce((sum, l) => {
      const lineTotal =
        l?.lineTotal != null
          ? Number(l.lineTotal)
          : Number(l?.qty ?? 0) * Number(l?.unitPrice ?? 0)
      return sum + (Number.isFinite(lineTotal) ? lineTotal : 0)
    }, 0)
    const disc = Number(discount ?? 0) || 0
    const total = subtotal - disc
    return {
      subtotal: Math.round(subtotal * 100) / 100,
      total: Math.round(total * 100) / 100,
    }
  }

  async create(tenantId: string, body: any, userId?: string) {
    const lines: QuoteLine[] = Array.isArray(body?.lines) ? body.lines : []
    const computed = this.computeTotals(lines, body?.discount)

    const quote = this.repo.create({
      ...body,
      tenantId,
      createdBy: userId,
      quoteNumber: body?.quoteNumber || (await this.generateQuoteNumber(tenantId)),
      status: body?.status || 'draft',
      lines,
      subtotal: body?.subtotal != null ? body.subtotal : computed.subtotal,
      discount: body?.discount != null ? body.discount : 0,
      total: body?.total != null ? body.total : computed.total,
    })
    return this.repo.save(quote)
  }

  async update(tenantId: string, id: string, body: any) {
    const quote = await this.get(tenantId, id)
    Object.assign(quote, body)
    // Recompute totals when lines or discount change and explicit values are absent.
    if ((body?.lines != null || body?.discount != null) && body?.total == null) {
      const computed = this.computeTotals(quote.lines, quote.discount)
      if (body?.subtotal == null) quote.subtotal = computed.subtotal
      quote.total = computed.total
    }
    return this.repo.save(quote)
  }

  async remove(tenantId: string, id: string) {
    const quote = await this.get(tenantId, id)
    await this.repo.remove(quote)
    return { deleted: true }
  }

  async accept(tenantId: string, id: string) {
    const quote = await this.get(tenantId, id)
    quote.status = 'accepted'
    return this.repo.save(quote)
  }
}
