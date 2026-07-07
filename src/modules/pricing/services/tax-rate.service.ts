import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { TaxRate } from '../../../database/entities/tax-rate.entity'
import { BaseRateService } from './base-rate.service'

@Injectable()
export class TaxRateService extends BaseRateService<TaxRate> {
  constructor(@InjectRepository(TaxRate) repo: Repository<TaxRate>) {
    super(repo)
  }

  // Resolve all applicable taxes for a country/state. State-specific overrides
  // country-wide; country-null rows apply everywhere.
  async resolve(
    tenantId: string,
    loc: { country?: string; state?: string },
    asOf = new Date(),
  ): Promise<TaxRate[]> {
    const rows = await this.repo.find({ where: { tenantId } as any })
    const eq = (a?: string, b?: string) => !a || (a || '').toLowerCase() === (b || '').toLowerCase()
    return rows
      .filter((r) => r.status === 'active')
      .filter((r) => !r.effectiveDate || new Date(r.effectiveDate) <= asOf)
      .filter((r) => eq(r.country, loc.country) && eq(r.state, loc.state))
  }

  compute(taxes: TaxRate[], subtotal: number): { amount: number; lines: any[] } {
    let amount = 0
    const lines = taxes.map((t) => {
      const a =
        t.method === 'percentage' ? (subtotal * Number(t.value)) / 100 : Number(t.value)
      amount += a
      return { name: t.name, type: t.taxType, method: t.method, value: Number(t.value), amount: a }
    })
    return { amount, lines }
  }
}
