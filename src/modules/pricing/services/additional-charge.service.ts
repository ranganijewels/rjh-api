import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { AdditionalCharge } from '../../../database/entities/additional-charge.entity'
import { BaseRateService } from './base-rate.service'

@Injectable()
export class AdditionalChargeService extends BaseRateService<AdditionalCharge> {
  constructor(@InjectRepository(AdditionalCharge) repo: Repository<AdditionalCharge>) {
    super(repo)
  }

  async resolveAll(tenantId: string, asOf = new Date()): Promise<AdditionalCharge[]> {
    const rows = await this.repo.find({ where: { tenantId, status: 'active' } as any })
    return rows.filter((r) => !r.effectiveDate || new Date(r.effectiveDate) <= asOf)
  }

  compute(charges: AdditionalCharge[], subtotal: number): { amount: number; lines: any[] } {
    let amount = 0
    const lines = charges.map((c) => {
      const a = c.method === 'percentage' ? (subtotal * Number(c.value)) / 100 : Number(c.value)
      amount += a
      return { name: c.name, type: c.chargeType, method: c.method, value: Number(c.value), amount: a }
    })
    return { amount, lines }
  }
}
