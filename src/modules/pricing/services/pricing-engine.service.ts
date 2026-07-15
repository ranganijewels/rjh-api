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
  // The purity the product's stored weight was actually entered at (usually
  // 14K, matching the Materials metal row) — used as the anchor for the
  // purity → weight adjustment below. Not overridable via `opts`.
  baseMetalPurity?: string
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
  // Selected/stored CENTRE stone carat — drives the metal-weight matrix and,
  // when diamondLines are present, overrides the centre line's carat (side
  // stones keep their own weight).
  centerCaratCt?: number
  // Per-line diamond breakdown (centre + side stones). When present, diamond
  // value is the SUM of each line priced by its OWN shape + carat band —
  // e.g. Emerald 0.26ct × its rate + Round 0.18ct × its rate — instead of one
  // total-carat × centre-shape lookup.
  diamondLines?: Array<{
    shape?: string
    carat: number
    color?: string
    clarity?: string
    qualityGrade?: string
    isCenter?: boolean
    pcs?: number
  }>
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

    // Per-line diamonds from the Materials BOM — each priced by its own
    // shape + carat band (centre + side stones), summed.
    const materials = Array.isArray((p.metadata as any)?.materials)
      ? (p.metadata as any).materials
      : []
    const diamondLines = materials
      .filter((m: any) => String(m?.materialType || '').toLowerCase() === 'diamond')
      .map((m: any) => ({
        shape: m.shape,
        carat: Number(m.wt) || 0,
        color: m.color,
        clarity: m.quality,
        qualityGrade: m.quality,
        isCenter: !!m.centerStone,
        pcs: Number(m.pcs) || 0,
      }))
      .filter((d: any) => d.carat > 0)

    const attrs: PriceAttributes = {
      metalType: p.metalType,
      metalPurity: p.metalPurity,
      baseMetalPurity: p.metalPurity,
      metalColor: p.metalColor,
      centerCaratCt: Number(p.centerStoneWeightCt) || 0,
      diamondLines: diamondLines.length ? diamondLines : undefined,
      grossWeightG: Number(p.grossWeightG) || 0,
      netWeightG: Number(p.netWeightG) || 0,
      diamondShape: p.diamondShape,
      diamondWeightCt: Number(p.diamondWeightCt) || 0,
      diamondQuality: p.diamondQuality,
      // Previously missing entirely — any Diamond Rate master row that
      // requires an exact color/clarity match (rather than a wildcard)
      // could never match ANY product, since the matcher never received
      // these two attributes at all.
      diamondColor: p.diamondColor,
      diamondClarity: p.diamondClarity,
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
   * Casting weight differs by purity (alloy density) even for the same mold.
   * Weight is entered/stored at one reference purity (baseMetalPurity, usually
   * 14K). Anchored at 14K = 1.0: 10K = −15%, 18K = +15%, Silver = 10K − 15%
   * (≈ −27.75% off 14K). Purities outside this set (22K, Platinum, …) are
   * left unscaled — only these four are defined by the rule.
   */
  private purityWeightFactor(purity?: string): number | null {
    if (!purity) return null
    const p = purity.trim().toUpperCase()
    if (p.includes('10K')) return 0.85
    if (p.includes('14K')) return 1
    if (p.includes('18K')) return 1.15
    if (p.includes('SILVER') || p.includes('925') || p.includes('999') || p.includes('800'))
      return 0.85 * 0.85
    return null
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
    const round = (n: number) => Math.round(n * 100) / 100
    // CENTRE stone carat drives the metal-weight matrix (a bigger centre needs
    // more metal for its setting). Prefer the explicit/selected centre carat;
    // fall back to the total diamondWeightCt for callers that don't split it.
    const centerCarat = Number(attrs.centerCaratCt) || Number(attrs.diamondWeightCt) || 0

    // ── Diamond value: price EACH line by its OWN shape + carat band, then sum
    // (centre + side stones). The centre line uses the selected/stored centre
    // carat; side stones keep their entered weight. Falls back to a single
    // total-carat × centre-shape lookup when no per-line data is supplied.
    let diamondValue = 0
    let totalDiamondCt = 0
    let anyDiamondMatched = false
    let firstDiamondRateId: string | null = null
    const diamondLinesOut: any[] = []
    if (Array.isArray(attrs.diamondLines) && attrs.diamondLines.length) {
      for (const ln of attrs.diamondLines) {
        const lineCt = ln.isCenter
          ? centerCarat || Number(ln.carat) || 0
          : Number(ln.carat) || 0
        if (lineCt <= 0) continue
        const { rate, perCarat: lpc } = await this.diamond.resolvePerCarat(
          tenantId,
          { shape: ln.shape, carat: lineCt, color: ln.color, clarity: ln.clarity, qualityGrade: ln.qualityGrade },
          asOf,
        )
        diamondValue += lineCt * lpc
        totalDiamondCt += lineCt
        if (rate) {
          anyDiamondMatched = true
          firstDiamondRateId = firstDiamondRateId || rate.id
        }
        diamondLinesOut.push({
          shape: ln.shape || null,
          isCenter: !!ln.isCenter,
          caratWeight: round(lineCt),
          ratePerCarat: round(lpc),
          value: round(lineCt * lpc),
          matched: !!rate,
        })
      }
    } else {
      const c = Number(attrs.diamondWeightCt) || 0
      const { rate, perCarat: lpc } = await this.diamond.resolvePerCarat(
        tenantId,
        { shape: attrs.diamondShape, carat: c, color: attrs.diamondColor, clarity: attrs.diamondClarity, qualityGrade: attrs.diamondQuality },
        asOf,
      )
      diamondValue = c * lpc
      totalDiamondCt = c
      anyDiamondMatched = !!rate
      firstDiamondRateId = rate?.id ?? null
      if (c > 0)
        diamondLinesOut.push({
          shape: attrs.diamondShape || null,
          isCenter: true,
          caratWeight: round(c),
          ratePerCarat: round(lpc),
          value: round(diamondValue),
          matched: !!rate,
        })
    }
    const avgPerCarat = totalDiamondCt > 0 ? diamondValue / totalDiamondCt : 0

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
    const matrixWeight = this.resolveMatrixWeight(attrs.productWeightMatrix, centerCarat)
    const explicitNet = Number(attrs.netWeightG) || 0
    const { row: dmwRow, metalWeightG } = await this.diamondMetalWeight.resolve(
      tenantId,
      { metalType: attrs.metalType, category: attrs.category, diamondCt: centerCarat },
      asOf,
    )
    const usedMatrix = matrixWeight != null
    const usedMaster = !usedMatrix && explicitNet <= 0 && !!dmwRow
    const resolvedWeightG = usedMatrix
      ? matrixWeight
      : explicitNet > 0
      ? explicitNet
      : usedMaster
      ? metalWeightG
      : Number(attrs.grossWeightG) || 0
    // Scale the resolved (base-purity) weight to the purity actually being
    // priced — e.g. switching a 14K-entered product to 10K on the storefront
    // configurator should reduce the metal weight, not just its rate.
    const baseFactor = this.purityWeightFactor(attrs.baseMetalPurity)
    const targetFactor = this.purityWeightFactor(attrs.metalPurity)
    const purityWeightMultiplier = baseFactor && targetFactor ? targetFactor / baseFactor : 1
    const netWeightG = resolvedWeightG * purityWeightMultiplier
    const hasDerivedWeight = usedMatrix || usedMaster
    const diamondWeightInGrams = totalDiamondCt * 0.2 // 1 carat = 0.2 g
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

    // 2) Diamond value already computed per-line above (diamondValue).

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
        carat: totalDiamondCt,
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
          // Purity-adjusted weight — resolvedWeightG is the weight at
          // baseMetalPurity (as entered/stored); netWeightG above is scaled
          // to attrs.metalPurity via the ±15% purity rule.
          baseWeightG: round(resolvedWeightG),
          baseMetalPurity: attrs.baseMetalPurity ?? null,
          purityWeightMultiplier: round(purityWeightMultiplier),
        },
        metal: {
          netWeightG: round(netWeightG),
          ratePerGram: round(perGram),
          rateId: metalRate?.id ?? null,
          matched: !!metalRate,
          value: round(metalValue),
        },
        diamond: {
          caratWeight: round(totalDiamondCt),
          ratePerCarat: round(avgPerCarat),
          rateId: firstDiamondRateId,
          matched: anyDiamondMatched,
          value: round(diamondValue),
        },
        // Per-line breakdown (centre + side stones), each priced by its own
        // shape + carat band. Sums to `diamond.value` above.
        diamonds: diamondLinesOut,
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
        !anyDiamondMatched && totalDiamondCt > 0 ? 'No matching diamond rate' : null,
        !laborRate ? 'No matching labor rate' : null,
        // NOTE: weight is managed per-product (matrix / net weight), so using the
        // product's own weight is normal — not a warning. Only a genuinely missing
        // weight (netWeightG <= 0 above) is flagged.
        finalPrice < 200 ? 'Final price is suspiciously low — check product attributes' : null,
      ].filter(Boolean),
    }
  }
}
