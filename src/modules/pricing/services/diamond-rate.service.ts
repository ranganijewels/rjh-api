import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { DiamondRate } from '../../../database/entities/diamond-rate.entity'
import { BaseRateService } from './base-rate.service'

@Injectable()
export class DiamondRateService extends BaseRateService<DiamondRate> {
  constructor(@InjectRepository(DiamondRate) repo: Repository<DiamondRate>) {
    super(repo)
  }

  // Resolve the per-carat rate for given shape/carat/quality. Nullable slab
  // attributes are wildcards; the most specific matching slab wins.
  async resolvePerCarat(
    tenantId: string,
    attrs: { shape?: string; carat?: number; color?: string; clarity?: string; qualityGrade?: string },
    asOf = new Date(),
  ): Promise<{ rate: DiamondRate | null; perCarat: number }> {
    const rows = await this.repo.find({ where: { tenantId } as any })
    const carat = Number(attrs.carat) || 0
    const eq = (a?: string, b?: string) =>
      !a || (a || '').toLowerCase() === (b || '').toLowerCase()

    const candidates = rows
      .filter((r) => r.status === 'active')
      .filter((r) => !r.effectiveDate || new Date(r.effectiveDate) <= asOf)
      .filter(
        (r) =>
          eq(r.shape, attrs.shape) &&
          carat >= Number(r.minCarat) &&
          carat <= Number(r.maxCarat) &&
          eq(r.color, attrs.color) &&
          eq(r.clarity, attrs.clarity) &&
          eq(r.qualityGrade, attrs.qualityGrade),
      )

    // Score: more specific (non-null matched attrs) + later effective date wins.
    const score = (r: DiamondRate) =>
      (r.shape ? 4 : 0) +
      (r.color ? 2 : 0) +
      (r.clarity ? 2 : 0) +
      (r.qualityGrade ? 1 : 0)
    candidates.sort(
      (a, b) =>
        score(b) - score(a) ||
        new Date(b.effectiveDate || 0).getTime() - new Date(a.effectiveDate || 0).getTime(),
    )
    const rate = candidates[0] ?? null
    return { rate, perCarat: rate ? Number(rate.rateValue) : 0 }
  }
}
