import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { ProductBom } from '../../../database/entities/product-bom.entity'

@Injectable()
export class ProductBomService {
  constructor(
    @InjectRepository(ProductBom)
    private readonly repo: Repository<ProductBom>,
  ) {}

  list(tenantId: string, filter: { familyId?: string; masterCode?: string } = {}) {
    const where: any = { tenantId }
    if (filter.familyId) where.familyId = filter.familyId
    if (filter.masterCode) where.masterCode = filter.masterCode
    return this.repo.find({ where, order: { createdAt: 'DESC' } })
  }

  async get(tenantId: string, id: string): Promise<ProductBom> {
    const row = await this.repo.findOne({ where: { id, tenantId } })
    if (!row) throw new NotFoundException(`BOM ${id} not found`)
    return row
  }

  /** The current effective, approved revision for a family or master code. */
  async resolveEffective(
    tenantId: string,
    filter: { familyId?: string; masterCode?: string },
    asOf: Date = new Date(),
  ): Promise<ProductBom | null> {
    if (!filter.familyId && !filter.masterCode) return null
    const where: any = { tenantId, status: 'approved' }
    if (filter.familyId) where.familyId = filter.familyId
    else where.masterCode = filter.masterCode
    const rows = await this.repo.find({ where, order: { revNo: 'DESC' } })
    const eligible = rows.filter(
      (r) => !r.effectiveDate || new Date(r.effectiveDate) <= asOf,
    )
    return eligible[0] || rows[0] || null
  }

  async create(tenantId: string, dto: Partial<ProductBom>, userId?: string) {
    // New revision: auto-increment rev_no within the same family/master.
    const siblings = await this.list(tenantId, {
      familyId: dto.familyId,
      masterCode: dto.masterCode,
    })
    const revNo = dto.revNo ?? (siblings.reduce((m, r) => Math.max(m, r.revNo), 0) + 1)
    const row = this.repo.create({
      ...dto,
      tenantId,
      revNo,
      createdBy: userId,
      status: dto.status || 'draft',
      weightCurve: dto.weightCurve || {},
      components: Array.isArray(dto.components) ? dto.components : [],
    })
    return this.repo.save(row)
  }

  async update(tenantId: string, id: string, dto: Partial<ProductBom>) {
    const row = await this.get(tenantId, id)
    Object.assign(row, dto)
    if (dto.status === 'approved' && !row.approvedAt) row.approvedAt = new Date()
    return this.repo.save(row)
  }

  async remove(tenantId: string, id: string) {
    const row = await this.get(tenantId, id)
    await this.repo.remove(row)
    return { success: true }
  }

  /**
   * Compute net metal weight for a chosen center carat + ring size from a BOM's
   * weight curve. Exact carat key wins; else nearest defined carat. Adds the
   * ring-size delta and the metal-loss allowance.
   */
  computeNetWeight(bom: ProductBom, centerCt: number, ringSize?: number): number {
    const curve = bom.weightCurve || {}
    const keys = Object.keys(curve).map(Number).filter((n) => Number.isFinite(n))
    let base = 0
    if (keys.length) {
      const exact = curve[String(centerCt)] ?? curve[centerCt.toFixed(2)]
      if (exact != null) base = Number(exact)
      else {
        let best = keys[0]
        let bestDiff = Infinity
        for (const k of keys) {
          const d = Math.abs(k - centerCt)
          if (d < bestDiff) { bestDiff = d; best = k }
        }
        base = Number(curve[String(best)] ?? curve[best.toFixed(2)] ?? 0)
      }
    }
    const loss = Number(bom.metalLossPct) || 0
    let g = base * (1 + loss / 100)
    if (ringSize != null && Number.isFinite(ringSize)) {
      const delta = Number(bom.ringSizeDeltaPerSize) || 0
      const baseSize = Number(bom.baseRingSize) || 0
      g += delta * (ringSize - baseSize)
    }
    return Math.max(0, Math.round(g * 1000) / 1000)
  }
}
