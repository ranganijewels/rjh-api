import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { MetalRate } from '../../../database/entities/metal-rate.entity'
import { BaseRateService } from './base-rate.service'

const GRAMS_PER_OUNCE = 31.1035

@Injectable()
export class MetalRateService extends BaseRateService<MetalRate> {
  constructor(@InjectRepository(MetalRate) repo: Repository<MetalRate>) {
    super(repo)
  }

  // Returns price-per-gram for the given metal+purity at `asOf`.
  async resolvePerGram(
    tenantId: string,
    metalType: string,
    purity: string,
    asOf = new Date(),
  ): Promise<{ rate: MetalRate | null; perGram: number }> {
    const rows = await this.repo.find({ where: { tenantId } as any })
    const norm = (s?: string) => (s || '').toUpperCase().replace('KT', 'K').trim()
    const rate = this.pickEffective(
      rows,
      asOf,
      (r) =>
        (r.metalType || '').toLowerCase() === (metalType || '').toLowerCase() &&
        norm(r.purity) === norm(purity),
    )
    if (!rate) return { rate: null, perGram: 0 }
    const perGram =
      rate.rateUnit === 'per_ounce' ? Number(rate.rate) / GRAMS_PER_OUNCE : Number(rate.rate)
    return { rate, perGram }
  }
}
