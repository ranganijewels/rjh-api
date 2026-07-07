import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { PricingConfig } from '../../database/entities/pricing-config.entity'

const DEFAULT_TENANT = 'default'

@Injectable()
export class PricingConfigService {
  constructor(
    @InjectRepository(PricingConfig)
    private readonly repo: Repository<PricingConfig>,
  ) {}

  async getConfig(tenantId: string): Promise<PricingConfig> {
    let config = await this.repo.findOne({ where: { tenantId } })
    if (!config) {
      config = this.repo.create({ tenantId })
      await this.repo.save(config)
    }
    return config
  }

  async updateConfig(tenantId: string, updates: Partial<PricingConfig>): Promise<PricingConfig> {
    let config = await this.repo.findOne({ where: { tenantId } })
    if (!config) {
      config = this.repo.create({ tenantId })
    }
    Object.assign(config, updates)
    return this.repo.save(config)
  }

  async calculatePrice(params: {
    tenantId: string
    grossWeightG?: number
    metalType?: string
    metalPurity?: string
    metalColor?: string
    diamondType?: string
    diamondWeightCt?: number
    diamondQuality?: string
  }) {
    const cfg = await this.getConfig(params.tenantId)

    // Metal calculation
    const grossWeight = Number(params.grossWeightG) || 0
    const metalKey = params.metalType || 'Gold'
    const purityKey = (params.metalPurity || '18K').replace('KT', 'K').toUpperCase()
    const colorKey = params.metalColor ? params.metalColor.charAt(0).toUpperCase() + params.metalColor.slice(1).toLowerCase() : 'Yellow'

    const metalPricePerGram = Number(cfg.metalPrices?.[metalKey] ?? cfg.metalPrices?.['Gold'] ?? 6500)
    const purityMultiplier = Number(cfg.metalPurityMultipliers?.[purityKey] ?? cfg.metalPurityMultipliers?.['18K'] ?? 0.75)
    const colorMultiplier = Number(cfg.metalColorMultipliers?.[colorKey] ?? cfg.metalColorMultipliers?.[params.metalColor?.toLowerCase() ?? ''] ?? 1.0)

    const metalAmount = grossWeight * metalPricePerGram * purityMultiplier * colorMultiplier

    // Diamond calculation
    const diamondWeight = Number(params.diamondWeightCt) || 0
    const diamondTypeKey = params.diamondType || 'Lab Grown Diamond'
    const qualityKey = params.diamondQuality || 'F-VS2'

    const diamondPricePerCarat = Number(cfg.diamondPrices?.[diamondTypeKey] ?? cfg.diamondPrices?.['Lab Grown Diamond'] ?? 45000)
    const qualityMultiplier = Number(cfg.diamondQualityMultipliers?.[qualityKey] ?? 1.0)
    const diamondAmount = diamondWeight * diamondPricePerCarat * qualityMultiplier

    // Labor calculation
    const makingCharge = Number(cfg.makingChargePerGram) * grossWeight
    const laborFlat = Number(cfg.laborChargeFlat) || 0
    const labourAmount = makingCharge + laborFlat

    // Total before GST
    const subtotal = metalAmount + diamondAmount + labourAmount
    const gstAmount = subtotal * (Number(cfg.gstPercent) / 100)
    const total = Math.max(subtotal + gstAmount, Number(cfg.minPriceFloor) || 0)

    return {
      total_price: Math.round(total),
      metal_amount: Math.round(metalAmount),
      diamond_amount: Math.round(diamondAmount),
      labour_amount: Math.round(labourAmount),
      gst_amount: Math.round(gstAmount),
      pricing_details: {
        gross_weight_g: grossWeight,
        metal_price_per_gram: metalPricePerGram,
        purity_multiplier: purityMultiplier,
        color_multiplier: colorMultiplier,
        diamond_price_per_carat: diamondPricePerCarat,
        quality_multiplier: qualityMultiplier,
        making_charge_per_gram: Number(cfg.makingChargePerGram),
        gst_percent: Number(cfg.gstPercent),
      },
    }
  }
}
