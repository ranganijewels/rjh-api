import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { ShippingRate } from '../../../database/entities/shipping-rate.entity'
import { BaseRateService } from './base-rate.service'

@Injectable()
export class ShippingRateService extends BaseRateService<ShippingRate> {
  constructor(@InjectRepository(ShippingRate) repo: Repository<ShippingRate>) {
    super(repo)
  }

  // Resolve the shipping cost for a destination + weight.
  async resolve(
    tenantId: string,
    loc: { country?: string; state?: string; weightG?: number },
    asOf = new Date(),
  ): Promise<{ rate: ShippingRate | null; amount: number }> {
    const rows = await this.repo.find({ where: { tenantId } as any })
    const weight = Number(loc.weightG) || 0
    const eq = (a?: string, b?: string) => !a || (a || '').toLowerCase() === (b || '').toLowerCase()

    const candidates = rows
      .filter((r) => r.status === 'active')
      .filter((r) => !r.effectiveDate || new Date(r.effectiveDate) <= asOf)
      .filter(
        (r) =>
          eq(r.country, loc.country) &&
          eq(r.state, loc.state) &&
          weight >= Number(r.minWeightG) &&
          weight <= Number(r.maxWeightG),
      )
    const score = (r: ShippingRate) => (r.state ? 2 : 0) + (r.country ? 1 : 0)
    candidates.sort(
      (a, b) =>
        score(b) - score(a) ||
        new Date(b.effectiveDate || 0).getTime() - new Date(a.effectiveDate || 0).getTime(),
    )
    const rate = candidates[0] ?? null
    if (!rate) return { rate: null, amount: 0 }
    const amount =
      rate.rateType === 'weight_based' ? Number(rate.rate) * weight : Number(rate.rate)
    return { rate, amount }
  }
}
