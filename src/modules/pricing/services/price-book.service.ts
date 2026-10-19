import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, In } from 'typeorm'
import { PriceBook } from '../../../database/entities/price-book.entity'

@Injectable()
export class PriceBookService {
  constructor(
    @InjectRepository(PriceBook)
    private readonly repo: Repository<PriceBook>,
  ) {}

  list(tenantId: string, includeInactive = false) {
    const where: any = { tenantId }
    if (!includeInactive) where.status = 'active'
    return this.repo.find({ where, order: { priority: 'DESC', createdAt: 'DESC' } })
  }

  async get(tenantId: string, id: string): Promise<PriceBook> {
    const row = await this.repo.findOne({ where: { id, tenantId } })
    if (!row) throw new NotFoundException(`Price book ${id} not found`)
    return row
  }

  create(tenantId: string, dto: Partial<PriceBook>, userId?: string) {
    const row = this.repo.create({ ...dto, tenantId, createdBy: userId, status: dto.status || 'active' })
    return this.repo.save(row)
  }

  async bulkCreate(tenantId: string, items: Partial<PriceBook>[], userId?: string) {
    const rows = items.map((i) => this.repo.create({ ...i, tenantId, createdBy: userId }))
    return this.repo.save(rows)
  }

  async update(tenantId: string, id: string, dto: Partial<PriceBook>) {
    const row = await this.get(tenantId, id)
    Object.assign(row, dto)
    return this.repo.save(row)
  }

  async remove(tenantId: string, id: string) {
    const row = await this.get(tenantId, id)
    await this.repo.remove(row)
    return { success: true }
  }

  async bulkRemove(tenantId: string, ids: string[]): Promise<{ deleted: number }> {
    if (!ids?.length) return { deleted: 0 }
    const result = await this.repo.delete({ tenantId, id: In(ids) } as any)
    return { deleted: result.affected ?? 0 }
  }

  /** Resolve the best price book by id, else by customer type (+ country), else null. */
  async resolve(
    tenantId: string,
    opts: { priceBookId?: string; customerType?: string; country?: string },
  ): Promise<PriceBook | null> {
    if (opts.priceBookId) {
      const byId = await this.repo.findOne({
        where: { id: opts.priceBookId, tenantId, status: 'active' },
      })
      if (byId) return byId
    }
    if (!opts.customerType) return null
    const rows = await this.repo.find({
      where: { tenantId, status: 'active', customerType: opts.customerType },
      order: { priority: 'DESC' },
    })
    const byCountry = opts.country ? rows.find((r) => r.country === opts.country) : null
    return byCountry || rows[0] || null
  }
}
