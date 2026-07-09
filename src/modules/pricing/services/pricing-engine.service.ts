import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Product } from '../../../database/entities/product.entity'
import { MetalRateService } from './metal-rate.service'
import { DiamondRateService } from './diamond-rate.service'
import { LaborRateService } from './labor-rate.service'
import { TaxRateService } from './tax-rate.service'
import { ShippingRateService } from './shipping-rate.service'
import { AdditionalChargeService } from './additional-charge.service'
import { DiamondMetalWeightService } from './diamond-metal-weight.service'
import { PriceBookService } from './price-book.service'

// Attributes the engine needs. Sourced from a product or supplied directly
// (price preview / what-if). NO price fields here — prices are derived.
export interface PriceAttributes {
  metalType?: string
  metalPurity?: string
  metalColor?: string
  grossWeightG?: number
  netWeightG?: number   // explicit override; normally auto-computed from diamond-metal-weight table
  // Per-product carat→metal-weight rows (from product.metadata.weightMatrix).
  // Highest-priority net-weight source — overrides the global master.
  productWeightMatrix?: Array<{ carat: number; weightG: number }>
  diamondShape?: string
  diamondWeightCt?: number
  diamondColor?: string
  diamondClarity?: string
  diamondQuality?: string
  category?: string
  // destination for tax/shipping
  country?: string
  state?: string
  // optional overrides
  marginPercent?: number
  discount?: number
  includeShipping?: boolean
  // Multi-audience pricing — applies a price book's margin/markup/discount.
  priceBookId?: string
  // Per-product manual overrides (ERP "Labour Rate" / "Design MRP"):
  // labour amount replaces the labour-master charge; MRP replaces the final price.
  labourAmountOverride?: number
  mrpOverride?: number
}

@Injectable()
export class PricingEngineService {
  // Tiny in-process cache for resolved breakdowns (rate masters change rarely).
  private cache = new Map<string, { at: number; data: any }>()
  private readonly TTL_MS = 60_000

  constructor(
    @InjectRepository(Product) private readonly productRepo: Repository<Product>,
    private readonly metal: MetalRateService,
    private readonly diamond: DiamondRateService,
    private readonly labor: LaborRateService,
    private readonly tax: TaxRateService,
    private readonly shipping: ShippingRateService,
    private readonly additional: AdditionalChargeService,
    private readonly diamondMetalWeight: DiamondMetalWeightService,
    private readonly priceBook: PriceBookService,
  ) {}

  invalidateCache() {
    this.cache.clear()
  }

  async calculateForProduct(
    tenantId: string,
    productId: string,
    opts: Partial<PriceAttributes> = {},
  ) {
    const cacheKey = `${tenantId}:${productId}:${JSON.stringify(opts)}`
    const hit = this.cache.get(cacheKey)
    if (hit && Date.now() - hit.at < this.TTL_MS) return hit.data

    const p = await this.productRepo.findOne({ where: { id: productId, tenantId } as any })
    if (!p) throw new NotFoundException(`Product ${productId} not found`)

    const attrs: PriceAttributes = {
      metalType: p.metalType,
      metalPurity: p.metalPurity,
      metalColor: p.metalColor,
      grossWeightG: Number(p.grossWeightG) || 0,
      netWeightG: Number(p.netWeightG) || 0,
      diamondShape: p.diamondShape,
      diamondWeightCt: Number(p.diamondWeightCt) || 0,
      diamondQuality: p.diamondQuality,
      category: p.category,
      productWeightMatrix: Array.isArray((p.metadata as any)?.weightMatrix)
        ? (p.metadata as any).weightMatrix
        : undefined,
      labourAmountOverride: Number(p.makingCharge) || 0,
      mrpOverride: Number((p.metadata as any)?.mrpOverride) || 0,
      ...opts,
    }
    const data = await this.calculate(tenantId, attrs)
    const result = { productId, sku: p.productCode, productName: p.productName, ...data }
    this.cache.set(cacheKey, { at: Date.now(), data: result })
    return result
  }

  /**
   * Resolve metal weight from a per-product carat→weight matrix.
   * Exact carat match wins; otherwise the nearest defined carat row.
   */
  private resolveMatrixWeight(
    matrix: Array<{ carat: number; weightG: number }> | undefined,
    carat: number,
  ): number | null {
    if (!Array.isArray(matrix) || !matrix.length || !carat) return null
    const exact = matrix.find((r) => Number(r.carat) === carat)
    if (exact) return Number(exact.weightG)
    let best: { carat: number; weightG: number } | null = null
    let bestDiff = Infinity
    for (const r of matrix) {
      const d = Math.abs(Number(r.carat) - carat)
      if (d < bestDiff) {
        bestDiff = d
        best = r
      }
    }
    return best ? Number(best.weightG) : null
  }

  // Core formula. Pure function of attributes + master data.
  async calculate(tenantId: string, attrs: PriceAttributes) {
    const asOf = new Date()
    const carat = Number(attrs.diamondWeightCt) || 0

    // ── Weight resolution ─────────────────────────────────────────────────────
    // Priority:
    //   1. Per-product carat→weight matrix  (product.metadata.weightMatrix — most specific)
    //   2. Diamond-metal-weight master lookup  (global, auto-derived from carat slab)
    //   3. attrs.netWeightG explicit override
    //   4. attrs.grossWeightG fallback
    //
    // netWeightG  = metal-only weight (grams of gold/silver/platinum in the piece)
    // grossWeightG = netWeightG + diamond weight in grams  (1 ct = 0.2 g)
    // Weight is managed PER PRODUCT: the per-product carat→weight matrix, then the
    // product's explicit net weight, take precedence. The global diamond-metal-weight
    // master is only a fallback for products that set neither (it is no longer edited
    // from a global screen — size→weight lives in the Add Product "Carat → Metal
    // Weight" table). Order: 1) matrix  2) explicit net  3) global master  4) gross.
    const matrixWeight = this.resolveMatrixWeight(attrs.productWeightMatrix, carat)
    const explicitNet = Number(attrs.netWeightG) || 0
    const { row: dmwRow, metalWeightG } = await this.diamondMetalWeight.resolve(
      tenantId,
      { metalType: attrs.metalType, category: attrs.category, diamondCt: carat },
      asOf,
    )
    const usedMatrix = matrixWeight != null
    const usedMaster = !usedMatrix && explicitNet <= 0 && !!dmwRow
    const netWeightG = usedMatrix
      ? matrixWeight
      : explicitNet > 0
      ? explicitNet
      : usedMaster
      ? metalWeightG
      : Number(attrs.grossWeightG) || 0
    const hasDerivedWeight = usedMatrix || usedMaster
    const diamondWeightInGrams = carat * 0.2 // 1 carat = 0.2 g
    const grossWeightG = hasDerivedWeight
      ? netWeightG + diamondWeightInGrams
      : Number(attrs.grossWeightG) || netWeightG

    // 1) Metal value = net metal weight × per-gram rate
    const { rate: metalRate, perGram } = await this.metal.resolvePerGram(
      tenantId,
      attrs.metalType,
      attrs.metalPurity,
      asOf,
    )
    const metalValue = netWeightG * perGram

    // 2) Diamond value = carat × per-carat rate
    const { rate: diamondRate, perCarat } = await this.diamond.resolvePerCarat(
      tenantId,
      {
        shape: attrs.diamondShape,
        carat,
        color: attrs.diamondColor,
        clarity: attrs.diamondClarity,
        qualityGrade: attrs.diamondQuality,
      },
      asOf,
    )
    const diamondValue = carat * perCarat

    // 3) Gemstone value — future (always 0 for now)
    const gemstoneValue = 0

    // 4) Labor / making charges
    //    fixed    → flat amount
    //    percentage → % of (metal + diamond)
    //    per_gram → netWeightG × rate  (labour on net metal weight)
    const baseForLabor = metalValue + diamondValue
    const { rate: laborRate, amount: laborChargeFromMaster } = await this.labor.resolve(
      tenantId,
      {
        metalType: attrs.metalType,
        category: attrs.category,
        carat,
        weightG: grossWeightG,
        netWeightG,
      },
      baseForLabor,
      asOf,
    )
    // Per-product flat labour override (product.makingCharge / ERP "Labour Rate").
    const labourOverride = Number(attrs.labourAmountOverride) || 0
    const laborCharge = labourOverride > 0 ? labourOverride : laborChargeFromMaster

    // 5) Additional charges (% computed on running subtotal)
    const subtotalBeforeAdd = metalValue + diamondValue + gemstoneValue + laborCharge
    const addCharges = await this.additional.resolveAll(tenantId, asOf)
    const { amount: additionalCharges, lines: additionalLines } = this.additional.compute(
      addCharges,
      subtotalBeforeAdd,
    )

    // 6) Price book + margin/markup/discount (multi-audience pricing)
    const book = attrs.priceBookId
      ? await this.priceBook.resolve(tenantId, { priceBookId: attrs.priceBookId })
      : null
    let subtotal = subtotalBeforeAdd + additionalCharges
    // Book margin overrides the attr margin when set.
    const marginPercent =
      book?.marginPercent != null && book.marginPercent !== undefined
        ? Number(book.marginPercent)
        : Number(attrs.marginPercent) || 0
    const marginAmount = (subtotal * marginPercent) / 100
    subtotal += marginAmount
    // Book markup (on post-margin subtotal).
    const markupPercent = Number(book?.markupPercent) || 0
    const markupAmount = (subtotal * markupPercent) / 100
    subtotal += markupAmount
    // Book discount (e.g. wholesale −20%) applied pre-tax.
    const bookDiscountPercent = Number(book?.discountPercent) || 0
    const bookDiscount = (subtotal * bookDiscountPercent) / 100
    subtotal = Math.max(0, subtotal - bookDiscount)

    // 7) Taxes (on subtotal)
    const taxes = await this.tax.resolve(tenantId, { country: attrs.country, state: attrs.state }, asOf)
    const { amount: taxAmount, lines: taxLines } = this.tax.compute(taxes, subtotal)

    // 8) Shipping (optional — typically added at checkout, not catalog price)
    let shippingAmount = 0
    let shippingRate = null
    if (attrs.includeShipping) {
      const ship = await this.shipping.resolve(
        tenantId,
        { country: attrs.country, state: attrs.state, weightG: grossWeightG },
        asOf,
      )
      shippingAmount = ship.amount
      shippingRate = ship.rate
    }

    // 9) Discounts (optional — usually coupon-applied at cart level)
    const discount = Number(attrs.discount) || 0

    const computedFinal = Math.max(0, subtotal + taxAmount + shippingAmount - discount)
    // Manual Design MRP wins over the computed price when set (> 0).
    const mrpOverride = Number(attrs.mrpOverride) || 0
    const finalPrice = mrpOverride > 0 ? mrpOverride : computedFinal

    const round = (n: number) => Math.round(n * 100) / 100

    return {
      metalValue: round(metalValue),
      diamondValue: round(diamondValue),
      gemstoneValue: round(gemstoneValue),
      laborCharge: round(laborCharge),
      additionalCharges: round(additionalCharges),
      marginAmount: round(marginAmount),
      markupAmount: round(markupAmount),
      bookDiscount: round(bookDiscount),
      taxAmount: round(taxAmount),
      shippingAmount: round(shippingAmount),
      discount: round(discount),
      finalPrice: round(finalPrice),
      computedPrice: round(computedFinal),
      mrpApplied: mrpOverride > 0,
      labourOverridden: labourOverride > 0,
      priceBreakdown: {
        weights: {
          netWeightG: round(netWeightG),
          grossWeightG: round(grossWeightG),
          diamondWeightInGrams: round(diamondWeightInGrams),
          metalWeightSource:
            matrixWeight != null ? 'product-matrix' : dmwRow ? 'global-master' : 'product-weight',
          metalWeightLookup: !!dmwRow,
          metalWeightRuleId: dmwRow?.id ?? null,
        },
        metal: {
          netWeightG: round(netWeightG),
          ratePerGram: round(perGram),
          rateId: metalRate?.id ?? null,
          matched: !!metalRate,
          value: round(metalValue),
        },
        diamond: {
          caratWeight: carat,
          ratePerCarat: round(perCarat),
          rateId: diamondRate?.id ?? null,
          matched: !!diamondRate,
          value: round(diamondValue),
        },
        labor: {
          type: laborRate?.laborType ?? null,
          rate: laborRate ? Number(laborRate.laborRate) : 0,
          rateId: laborRate?.id ?? null,
          matched: !!laborRate,
          appliedOnNetWeightG: round(netWeightG),
          value: round(laborCharge),
        },
        additionalCharges: additionalLines.map((l) => ({ ...l, amount: round(l.amount) })),
        margin: { percent: marginPercent, value: round(marginAmount) },
        priceBook: book
          ? {
              id: book.id,
              code: book.code,
              channel: book.channel,
              markupPercent: Number(book.markupPercent) || 0,
              markupValue: round(markupAmount),
              discountPercent: bookDiscountPercent,
              discountValue: round(bookDiscount),
            }
          : null,
        taxes: taxLines.map((l) => ({ ...l, amount: round(l.amount) })),
        shipping: { rateId: shippingRate?.id ?? null, value: round(shippingAmount) },
        discount: round(discount),
        finalPrice: round(finalPrice),
      },
      // warnings help admins spot missing master data / incomplete products
      warnings: [
        netWeightG <= 0 ? 'Missing metal weight — metal value is $0 (product is underpriced)' : null,
        netWeightG > 0 && metalValue <= 0 ? 'No matching metal rate — metal value is $0' : null,
        !metalRate && netWeightG > 0 ? 'No matching metal rate' : null,
        !diamondRate && carat > 0 ? 'No matching diamond rate' : null,
        !laborRate ? 'No matching labor rate' : null,
        // NOTE: weight is managed per-product (matrix / net weight), so using the
        // product's own weight is normal — not a warning. Only a genuinely missing
        // weight (netWeightG <= 0 above) is flagged.
        finalPrice < 200 ? 'Final price is suspiciously low — check product attributes' : null,
      ].filter(Boolean),
    }
  }
}
