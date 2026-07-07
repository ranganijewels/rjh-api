import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { LaborRate } from '../../../database/entities/labor-rate.entity'
import { BaseRateService } from './base-rate.service'

@Injectable()
export class LaborRateService extends BaseRateService<LaborRate> {
  constructor(@InjectRepository(LaborRate) repo: Repository<LaborRate>) {
    super(repo)
  }

  // Resolve the labor slab matching metal/category/carat/weight. Returns the
  // computed amount given a base (metal+diamond) value for percentage types.
  async resolve(
    tenantId: string,
    attrs: { metalType?: string; category?: string; carat?: number; weightG?: number; netWeightG?: number },
    baseValue: number,
    asOf = new Date(),
  ): Promise<{ rate: LaborRate | null; amount: number }> {
    const rows = await this.repo.find({ where: { tenantId } as any })
    const carat = Number(attrs.carat) || 0
    const weight = Number(attrs.weightG) || 0
    const eq = (a?: string, b?: string) => !a || (a || '').toLowerCase() === (b || '').toLowerCase()

    const candidates = rows
      .filter((r) => r.status === 'active')
      .filter((r) => !r.effectiveDate || new Date(r.effectiveDate) <= asOf)
      .filter(
        (r) =>
          eq(r.metalType, attrs.metalType) &&
          eq(r.productCategory, attrs.category) &&
          carat >= Number(r.minCarat) &&
          carat <= Number(r.maxCarat) &&
          weight >= Number(r.minWeightG) &&
          weight <= Number(r.maxWeightG),
      )
    const score = (r: LaborRate) => (r.metalType ? 2 : 0) + (r.productCategory ? 2 : 0)
    candidates.sort(
      (a, b) =>
        score(b) - score(a) ||
        new Date(b.effectiveDate || 0).getTime() - new Date(a.effectiveDate || 0).getTime(),
    )
    const rate = candidates[0] ?? null
    if (!rate) return { rate: null, amount: 0 }
    const netWg = Number(attrs.netWeightG ?? attrs.weightG) || 0
    const amount =
      rate.laborType === 'percentage'
        ? (baseValue * Number(rate.laborRate)) / 100
        : rate.laborType === 'per_gram'
        ? netWg * Number(rate.laborRate)
        : Number(rate.laborRate) // fixed
    return { rate, amount }
  }
}
