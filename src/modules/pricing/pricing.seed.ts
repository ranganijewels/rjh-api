import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { MetalRate } from '../../database/entities/metal-rate.entity'
import { DiamondRate } from '../../database/entities/diamond-rate.entity'
import { LaborRate } from '../../database/entities/labor-rate.entity'
import { TaxRate } from '../../database/entities/tax-rate.entity'
import { ShippingRate } from '../../database/entities/shipping-rate.entity'
import { AdditionalCharge } from '../../database/entities/additional-charge.entity'

const TENANT = '00000000-0000-0000-0000-000000000001'
// Base currency USD. Rates are illustrative starting points — editable in Admin.

@Injectable()
export class PricingSeeder {
  private readonly logger = new Logger(PricingSeeder.name)

  constructor(
    @InjectRepository(MetalRate) private metal: Repository<MetalRate>,
    @InjectRepository(DiamondRate) private diamond: Repository<DiamondRate>,
    @InjectRepository(LaborRate) private labor: Repository<LaborRate>,
    @InjectRepository(TaxRate) private tax: Repository<TaxRate>,
    @InjectRepository(ShippingRate) private shipping: Repository<ShippingRate>,
    @InjectRepository(AdditionalCharge) private additional: Repository<AdditionalCharge>,
  ) {}

  async seedDefaults() {
    const eff = new Date('2026-01-01T00:00:00Z')
    const base = { tenantId: TENANT, status: 'active', effectiveDate: eff }

    if ((await this.metal.count({ where: { tenantId: TENANT } })) === 0) {
      // USD per gram. 24K base ~ $85/g; lower purities scaled by gold content.
      await this.metal.save([
        this.metal.create({ ...base, metalType: 'Gold', purity: '24K', rateUnit: 'per_gram', rate: 85 }),
        this.metal.create({ ...base, metalType: 'Gold', purity: '22K', rateUnit: 'per_gram', rate: 78 }),
        this.metal.create({ ...base, metalType: 'Gold', purity: '18K', rateUnit: 'per_gram', rate: 64 }),
        this.metal.create({ ...base, metalType: 'Gold', purity: '14K', rateUnit: 'per_gram', rate: 50 }),
        this.metal.create({ ...base, metalType: 'Platinum', purity: '24K', rateUnit: 'per_gram', rate: 38 }),
        this.metal.create({ ...base, metalType: 'Silver', purity: '24K', rateUnit: 'per_gram', rate: 1.1 }),
      ])
      this.logger.log('Seeded metal rates')
    }

    if ((await this.diamond.count({ where: { tenantId: TENANT } })) === 0) {
      // USD per carat by carat slab (lab-grown). Generic (any-shape) + Round premium.
      await this.diamond.save([
        this.diamond.create({ ...base, shape: null, minCarat: 0, maxCarat: 0.5, rateValue: 400 }),
        this.diamond.create({ ...base, shape: null, minCarat: 0.5, maxCarat: 1.0, rateValue: 700 }),
        this.diamond.create({ ...base, shape: null, minCarat: 1.0, maxCarat: 2.0, rateValue: 1100 }),
        this.diamond.create({ ...base, shape: null, minCarat: 2.0, maxCarat: 99, rateValue: 1600 }),
        this.diamond.create({ ...base, shape: 'Round', minCarat: 0.5, maxCarat: 1.0, rateValue: 800 }),
        this.diamond.create({ ...base, shape: 'Round', minCarat: 1.0, maxCarat: 2.0, rateValue: 1250 }),
      ])
      this.logger.log('Seeded diamond rates')
    }

    if ((await this.labor.count({ where: { tenantId: TENANT } })) === 0) {
      await this.labor.save([
        this.labor.create({ ...base, minWeightG: 0, maxWeightG: 5, laborType: 'fixed', laborRate: 60 }),
        this.labor.create({ ...base, minWeightG: 5, maxWeightG: 10, laborType: 'fixed', laborRate: 120 }),
        this.labor.create({ ...base, minWeightG: 10, maxWeightG: 9999, laborType: 'percentage', laborRate: 12 }),
      ])
      this.logger.log('Seeded labor rates')
    }

    if ((await this.tax.count({ where: { tenantId: TENANT } })) === 0) {
      await this.tax.save([
        this.tax.create({ ...base, name: 'Sales Tax', taxType: 'Sales Tax', method: 'percentage', value: 0, country: 'US' }),
        this.tax.create({ ...base, name: 'GST', taxType: 'GST', method: 'percentage', value: 3, country: 'IN' }),
      ])
      this.logger.log('Seeded tax rates')
    }

    if ((await this.shipping.count({ where: { tenantId: TENANT } })) === 0) {
      await this.shipping.save([
        this.shipping.create({ ...base, zone: 'Domestic US', country: 'US', minWeightG: 0, maxWeightG: 999999, shippingMethod: 'Standard', rateType: 'fixed', rate: 0, estimatedDays: '3-5' }),
        this.shipping.create({ ...base, zone: 'International', country: null, minWeightG: 0, maxWeightG: 999999, shippingMethod: 'Express', rateType: 'fixed', rate: 40, estimatedDays: '7-12' }),
      ])
      this.logger.log('Seeded shipping rates')
    }

    if ((await this.additional.count({ where: { tenantId: TENANT } })) === 0) {
      await this.additional.save([
        this.additional.create({ ...base, name: 'IGI Certification', chargeType: 'Certification', method: 'fixed', value: 50 }),
        this.additional.create({ ...base, name: 'Premium Packaging', chargeType: 'Packaging', method: 'fixed', value: 15 }),
      ])
      this.logger.log('Seeded additional charges')
    }
  }
}
