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
    // Manually-typed master/product data (Materials BOM rows especially)
    // routinely carries stray leading/trailing whitespace — e.g. "Emerald "
    // vs "Emerald" — which silently broke every exact-match comparison here.
    // A master value may also be a comma-separated LIST (admin multi-selected
    // several qualities for one rate row, e.g. "VVS1,VVS2") — match if the
    // product's value is ANY of them. A plain single value behaves exactly
    // as before (a one-item list).
    const eq = (a?: string, b?: string) => {
      if (!a) return true
      const bv = (b || '').trim().toLowerCase()
      return a
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .includes(bv)
    }

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

  // Colours and clarities that have an active rate for this shape + carat —
  // the choices the storefront can offer, each of which re-prices correctly.
  async optionsFor(tenantId: string, shape: string | undefined, carat: number, asOf = new Date()) {
    const rows = await this.repo.find({ where: { tenantId } as any })
    const split = (v?: string) => String(v || '').split(',').map((x) => x.trim()).filter(Boolean)
    const shapeOk = (r: DiamondRate) =>
      !r.shape || split(r.shape).map((x) => x.toLowerCase()).includes(String(shape || '').trim().toLowerCase())
    const live = rows.filter(
      (r) =>
        r.status === 'active' &&
        (!r.effectiveDate || new Date(r.effectiveDate) <= asOf) &&
        shapeOk(r) &&
        carat >= Number(r.minCarat) &&
        carat <= Number(r.maxCarat),
    )
    const COLOR_ORDER = 'DEFGHIJKLMNOPQRSTUVWXYZ'
    const CLARITY_ORDER = ['FL', 'IF', 'VVS1', 'VVS2', 'VS1', 'VS2', 'SI1', 'SI2', 'SI3', 'I1', 'I2', 'I3']
    const uniq = (xs: string[]) => [...new Set(xs.map((x) => x.toUpperCase()))]
    const colors = uniq(live.flatMap((r) => split(r.color))).sort(
      (a, b) => (COLOR_ORDER.indexOf(a[0]) + 1 || 99) - (COLOR_ORDER.indexOf(b[0]) + 1 || 99) || a.localeCompare(b),
    )
    const clarities = uniq(live.flatMap((r) => split(r.clarity))).sort(
      (a, b) => (CLARITY_ORDER.indexOf(a) + 1 || 99) - (CLARITY_ORDER.indexOf(b) + 1 || 99) || a.localeCompare(b),
    )
    return { colors, clarities }
  }
}
