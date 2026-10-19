import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { DiamondMetalWeight } from '../../../database/entities/diamond-metal-weight.entity'
import { BaseRateService } from './base-rate.service'

@Injectable()
export class DiamondMetalWeightService extends BaseRateService<DiamondMetalWeight> {
  constructor(
    @InjectRepository(DiamondMetalWeight) repo: Repository<DiamondMetalWeight>,
  ) {
    super(repo)
  }

  // Find the best-matching metal weight for a given diamond carat total.
  // Most specific match wins (metalType + category > wildcard).
  async resolve(
    tenantId: string,
    attrs: { metalType?: string; category?: string; diamondCt?: number },
    asOf = new Date(),
  ): Promise<{ row: DiamondMetalWeight | null; metalWeightG: number }> {
    const rows = await this.repo.find({ where: { tenantId } as any })
    const carat = Number(attrs.diamondCt) || 0
    const eq = (a?: string, b?: string) =>
      !a || (a || '').toLowerCase() === (b || '').toLowerCase()

    const candidates = rows
      .filter((r) => r.status === 'active')
      .filter((r) => !r.effectiveDate || new Date(r.effectiveDate) <= asOf)
      .filter(
        (r) =>
          eq(r.metalType, attrs.metalType) &&
          eq(r.category, attrs.category) &&
          carat >= Number(r.minDiamondCt) &&
          carat <= Number(r.maxDiamondCt),
      )

    const score = (r: DiamondMetalWeight) =>
      (r.metalType ? 2 : 0) + (r.category ? 2 : 0)

    candidates.sort(
      (a, b) =>
        score(b) - score(a) ||
        new Date(b.effectiveDate || 0).getTime() -
          new Date(a.effectiveDate || 0).getTime(),
    )

    const row = candidates[0] ?? null
    return { row, metalWeightG: row ? Number(row.metalWeightG) : 0 }
  }
}
