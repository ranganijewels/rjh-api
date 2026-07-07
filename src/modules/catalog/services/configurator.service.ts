import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Product } from '../../../database/entities/product.entity'
import { ProductFamily } from '../../../database/entities/product-family.entity'
import { ProductBomService } from './product-bom.service'
import { PricingEngineService } from '../../pricing/services/pricing-engine.service'

export interface ConfigureInput {
  productId?: string
  familyId?: string
  shape?: string
  centerCt?: number
  metalType?: string
  purity?: string
  color?: string
  ringSize?: number
  diamondQuality?: string
  country?: string
  state?: string
  priceBookId?: string
}

/**
 * The Configurator is a pure function: (family/product, selected axes) → a fully
 * resolved variant {weights, price, breakdown, sku}. No state. It resolves net
 * metal weight from the effective BOM (carat curve × ring-size delta), then prices
 * it through the existing pricing engine. Variants are NEVER pre-materialized.
 */
@Injectable()
export class ConfiguratorService {
  constructor(
    @InjectRepository(Product) private readonly productRepo: Repository<Product>,
    @InjectRepository(ProductFamily) private readonly familyRepo: Repository<ProductFamily>,
    private readonly bom: ProductBomService,
    private readonly engine: PricingEngineService,
  ) {}

  private composeVariantCode(parts: (string | number | undefined)[]): string {
    return parts
      .filter((p) => p !== undefined && p !== null && p !== '')
      .map((p) => String(p).toUpperCase().replace(/\s+/g, ''))
      .join('-')
  }

  /**
   * Price simulation — a what-if matrix across center carats × metals × price books.
   * Used by merchandisers before publishing rate/book changes. Bounded to avoid blowups.
   */
  async simulate(
    tenantId: string,
    input: {
      productId?: string
      carats?: number[]
      metals?: Array<{ metalType: string; purity?: string; color?: string }>
      priceBookIds?: Array<string | null>
      ringSize?: number
    },
  ) {
    const carats = (input.carats?.length ? input.carats : [0.5, 1, 1.5, 2, 3]).slice(0, 10)
    const metals = (input.metals?.length
      ? input.metals
      : [{ metalType: 'Gold', purity: '18K', color: 'White' }]
    ).slice(0, 6)
    const books = (input.priceBookIds?.length ? input.priceBookIds : [null]).slice(0, 6)

    const rows: any[] = []
    for (const ct of carats) {
      for (const m of metals) {
        for (const pb of books) {
          const r = await this.configure(tenantId, {
            productId: input.productId,
            centerCt: ct,
            metalType: m.metalType,
            purity: m.purity,
            color: m.color,
            ringSize: input.ringSize,
            priceBookId: pb || undefined,
          })
          rows.push({
            centerCt: ct,
            metal: `${m.metalType} ${m.purity || ''} ${m.color || ''}`.trim(),
            priceBookId: pb || null,
            netWeightG: r.weights?.netWeightG ?? null,
            finalPrice: r.price?.finalPrice ?? 0,
          })
        }
      }
    }
    return {
      productId: input.productId || null,
      cells: rows.length,
      matrix: rows,
    }
  }

  async configure(tenantId: string, input: ConfigureInput) {
    const product = input.productId
      ? await this.productRepo.findOne({ where: { id: input.productId, tenantId } as any })
      : null
    if (input.productId && !product) {
      throw new NotFoundException(`Product ${input.productId} not found`)
    }

    // Resolve family (explicit, or from the product's metadata link)
    const familyId = input.familyId || (product?.metadata as any)?.familyId
    const centerCt =
      Number(input.centerCt) ||
      Number(product?.centerStoneWeightCt) ||
      Number(product?.diamondWeightCt) ||
      1

    const metalType = input.metalType || product?.metalType || 'Gold'
    const purity = input.purity || product?.metalPurity || '18K'
    const color = input.color || product?.metalColor || 'White'
    const shape = input.shape || product?.diamondShape || ''

    // ── Weight resolution: BOM curve (preferred) → product weightMatrix → product gross
    const masterCode = product?.productCode || undefined
    const bomRow = await this.bom.resolveEffective(tenantId, { familyId, masterCode })
    let netWeightG: number | null = null
    let weightSource = 'product-default'
    if (bomRow) {
      netWeightG = this.bom.computeNetWeight(bomRow, centerCt, input.ringSize)
      weightSource = `bom-rev-${bomRow.revNo}`
    }

    // ── Price via the existing engine. When BOM gives a weight, force it through the
    //    engine as a single-row weight matrix (top-priority net-weight source).
    const opts: Record<string, any> = {
      metalType,
      metalPurity: purity,
      metalColor: color,
      diamondShape: shape,
      diamondWeightCt: centerCt,
      diamondQuality: input.diamondQuality || product?.diamondQuality,
      country: input.country,
      state: input.state,
      priceBookId: input.priceBookId,
    }
    if (netWeightG != null) {
      opts.productWeightMatrix = [{ carat: centerCt, weightG: netWeightG }]
    }

    const priced = product
      ? await this.engine.calculateForProduct(tenantId, product.id, opts)
      : await this.engine.calculate(tenantId, opts as any)

    const variantCode = this.composeVariantCode([
      product?.productCode || familyId?.slice(0, 6),
      shape,
      Math.round(centerCt * 100),
      purity,
      color,
      input.diamondQuality || product?.diamondQuality,
      input.ringSize != null ? Math.round(input.ringSize * 10) : undefined,
    ])

    return {
      variantCode,
      resolved: {
        productId: product?.id,
        familyId,
        shape,
        centerCt,
        metalType,
        purity,
        color,
        ringSize: input.ringSize ?? null,
      },
      weights: {
        netWeightG: priced?.priceBreakdown?.weights?.netWeightG ?? netWeightG,
        grossWeightG: priced?.priceBreakdown?.weights?.grossWeightG ?? null,
        source: weightSource,
        bomRevision: bomRow ? bomRow.revNo : null,
      },
      price: {
        finalPrice: priced?.finalPrice ?? 0,
        currency: 'USD',
        priceBookId: input.priceBookId || null,
      },
      breakdown: priced?.priceBreakdown ?? null,
      warnings: priced?.warnings ?? [],
    }
  }
}
