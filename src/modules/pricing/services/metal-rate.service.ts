import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { MetalRate } from '../../../database/entities/metal-rate.entity'
import { CatalogMaster } from '../../../database/entities/catalog-master.entity'
import { BaseRateService } from './base-rate.service'

const GRAMS_PER_OUNCE = 31.1035
// Purity the derived prices are computed FROM (the only gold rate admin enters).
const BASE_PURITY = '24K'
// 24K fine gold basis used as the denominator of the purity factor (99.9%).
const DEFAULT_BASIS = 99.9

@Injectable()
export class MetalRateService extends BaseRateService<MetalRate> {
  constructor(
    @InjectRepository(MetalRate) repo: Repository<MetalRate>,
    @InjectRepository(CatalogMaster)
    private readonly masterRepo: Repository<CatalogMaster>,
  ) {
    super(repo)
  }

  private toPerGram(rate: MetalRate): number {
    return rate.rateUnit === 'per_ounce'
      ? Number(rate.rate) / GRAMS_PER_OUNCE
      : Number(rate.rate)
  }

  // Pricing factor for a purity from the KT master (catalog_masters
  // kind=metal_purity, metadata.pricingFactor). e.g. 18K→78, 14K→60, 10K→43.
  private async purityFactor(tenantId: string, purity: string): Promise<number | null> {
    const norm = (purity || '').toUpperCase().replace('KT', 'K').trim()
    if (!norm) return null
    const row = await this.masterRepo.findOne({
      where: { tenantId, kind: 'metal_purity', code: norm, status: 'active' },
    })
    const f = Number(row?.metadata?.pricingFactor)
    return Number.isFinite(f) && f > 0 ? f : null
  }

  /**
   * Price-per-gram for metal+purity at `asOf`.
   *
   * Resolution order:
   *  1. Exact (metalType, purity) rate row — an explicit row always wins.
   *  2. DERIVED: the metal's 24K base row × purityFactor/basis from the KT
   *     master. This is how gold works day-to-day: admin enters ONLY the 24K
   *     rate; 18K/14K/10K are computed as 24K × 78/99.9, ×60/99.9, ×43/99.9.
   *  3. For non-gold metals (Silver/Platinum) with a single admin-entered
   *     price: fall back to the metal's base row as-is (purity-agnostic),
   *     scaled by a factor only if the KT master defines one for that purity.
   */
  async resolvePerGram(
    tenantId: string,
    metalType: string,
    purity: string,
    asOf = new Date(),
  ): Promise<{ rate: MetalRate | null; perGram: number; derived?: boolean }> {
    const rows = await this.repo.find({ where: { tenantId } as any })
    const norm = (s?: string) => (s || '').toUpperCase().replace('KT', 'K').trim()
    const sameMetal = (r: MetalRate) =>
      (r.metalType || '').toLowerCase() === (metalType || '').toLowerCase()

    // 1) Exact purity row
    const exact = this.pickEffective(rows, asOf, (r) => sameMetal(r) && norm(r.purity) === norm(purity))
    if (exact) return { rate: exact, perGram: this.toPerGram(exact) }

    // 2/3) Base row for the metal: prefer the 24K row, else any single row.
    const base =
      this.pickEffective(rows, asOf, (r) => sameMetal(r) && norm(r.purity) === BASE_PURITY) ||
      this.pickEffective(rows, asOf, sameMetal)
    if (!base) return { rate: null, perGram: 0 }

    const basePerGram = this.toPerGram(base)
    const factor = await this.purityFactor(tenantId, purity)
    const isGold = (metalType || '').toLowerCase() === 'gold'

    if (factor) {
      const basis = (await this.purityFactor(tenantId, base.purity)) ?? DEFAULT_BASIS
      return { rate: base, perGram: (basePerGram * factor) / basis, derived: true }
    }

    // Gold without a factor can't be derived honestly — report "no rate" so the
    // engine surfaces its missing-rate warning instead of silently mispricing.
    if (isGold) return { rate: null, perGram: 0 }

    // Silver/Platinum: one admin-entered price covers all purities.
    return { rate: base, perGram: basePerGram, derived: true }
  }
}
