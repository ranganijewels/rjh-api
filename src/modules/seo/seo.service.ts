import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, SelectQueryBuilder } from 'typeorm'
import { SeoPage } from '../../database/entities/seo-page.entity'
import { Collection } from '../../database/entities/collection.entity'
import { CmsBlog } from '../../database/entities/cms-blog.entity'
import { SeoRedirect } from '../../database/entities/seo-redirect.entity'
import { PricingEngineService } from '../pricing/services/pricing-engine.service'
import { Product } from '../../database/entities/product.entity'
import { CatalogMaster } from '../../database/entities/catalog-master.entity'
import { defaultTokenContext, resolveTokens } from '../../common/utils/resolve-tokens.util'

const BRAND = 'Rangani Jewelry House'
const SITE = (process.env.SITE_URL || 'https://www.ranganijewelry.com').replace(/\/+$/, '')

// Owner-confirmed metal assortment (10K/14K/18K gold, 925 silver). Metal facet
// pages for anything else are unpublished by reconcileFacetPages().
const APPROVED_FACET_METALS = ['gold', 'silver']

const SHAPE_NOTES: Record<string, string> = {
  round: 'The round brilliant has the most facets of any shape and is cut for maximum sparkle — the classic solitaire choice.',
  oval: 'Ovals carry the brilliance of a round in an elongated outline that can make the finger look longer and the stone look larger for its weight.',
  princess: 'The princess cut is a square brilliant with crisp corners, best protected by prongs set at each point.',
  cushion: 'Cushion cuts pair softly rounded corners with large facets for a romantic, vintage-leaning glow.',
  emerald: 'Emerald cuts use long step facets that show clarity and produce broad flashes of light rather than scattered sparkle.',
  pear: 'The pear combines a rounded end with a single point, worn point-down to lengthen the hand.',
  marquise: 'The marquise has the longest outline of the classic shapes, so it appears large for its carat weight.',
  radiant: 'Radiant cuts combine the clean outline of an emerald with brilliant faceting for a lively, modern look.',
  asscher: 'The Asscher is a square step cut with cropped corners, known for its layered "hall of mirrors" look.',
  heart: 'Heart shapes need precise cutting to keep both lobes symmetrical — a romantic statement centre stone.',
}

const METAL_NOTES: Record<string, string> = {
  gold: 'Choose the gold karat and colour (yellow, white or rose) offered on each design — the karat changes durability, colour and price, and each design is priced live for the option you select.',
  silver: 'Our silver settings are 925 sterling silver, a lighter-budget way to wear a certified lab-grown diamond while keeping the same design.',
}

@Injectable()
export class SeoService {
  constructor(
    @InjectRepository(SeoPage)
    private readonly pages: Repository<SeoPage>,
    @InjectRepository(SeoRedirect)
    private readonly redirects: Repository<SeoRedirect>,
    @InjectRepository(Product)
    private readonly products: Repository<Product>,
    private readonly pricingEngine: PricingEngineService,
    @InjectRepository(CatalogMaster)
    private readonly masters: Repository<CatalogMaster>,
    @InjectRepository(Collection)
    private readonly collections: Repository<Collection>,
    @InjectRepository(CmsBlog)
    private readonly blogs: Repository<CmsBlog>,
  ) {}

  // ─── Pages CRUD ─────────────────────────────────────────────────────────────

  list(tenantId: string, query: any = {}) {
    const where: any = { tenantId }
    if (query?.type) where.type = query.type
    if (query?.status) where.status = query.status
    return this.pages.find({ where, order: { createdAt: 'DESC' } })
  }

  async get(tenantId: string, id: string): Promise<SeoPage> {
    const page = await this.pages.findOne({ where: { id, tenantId } })
    if (!page) throw new NotFoundException('SEO page not found')
    return page
  }

  create(tenantId: string, body: any, createdBy?: string) {
    const page = this.pages.create({ ...body, tenantId, createdBy } as Partial<SeoPage>)
    return this.pages.save(page)
  }

  async update(tenantId: string, id: string, body: any) {
    const page = await this.get(tenantId, id)
    Object.assign(page, body)
    return this.pages.save(page)
  }

  async remove(tenantId: string, id: string) {
    const page = await this.get(tenantId, id)
    await this.pages.remove(page)
    return { deleted: true, id }
  }

  // ─── Slug resolution (page or redirect) ─────────────────────────────────────

  async resolveSlug(tenantId: string, slug: string) {
    const clean = this.normalizeSlug(slug)

    const page = await this.pages.findOne({
      where: { tenantId, urlSlug: clean, status: 'published' },
    })
    if (page) {
      const products = page.type === 'facet' ? await this.facetProducts(tenantId, page, 24) : []
      return { kind: 'page', page, products }
    }

    const redirect = await this.redirects.findOne({
      where: { tenantId, fromSlug: clean },
    })
    if (redirect) {
      return {
        kind: 'redirect',
        code: redirect.code,
        to: redirect.toSlug,
        redirect,
      }
    }

    throw new NotFoundException(`No SEO page or redirect for slug "${clean}"`)
  }

  // ─── Programmatic facet page generation ─────────────────────────────────────

  async generateFacetPages(tenantId: string, base = 'engagement-rings') {
    const caratBands = [1, 2, 3]

    // Pull shapes + metals from the catalog master ("shapes are data") table.
    const shapeRows = await this.masters.find({
      where: { tenantId, kind: 'diamond_shape', status: 'active' },
      order: { sortOrder: 'ASC' },
    })
    const metalRows = await this.masters.find({
      where: { tenantId, kind: 'metal_type', status: 'active' },
      order: { sortOrder: 'ASC' },
    })

    const shapes = shapeRows.length
      ? shapeRows.map((r) => r.name)
      : ['Round', 'Oval', 'Princess', 'Cushion', 'Emerald']
    const metals = metalRows.length
      ? metalRows.map((r) => r.name)
      : ['Yellow Gold', 'White Gold', 'Rose Gold', 'Platinum']

    const baseLabel = this.titleFromSlug(base)
    let count = 0

    // carat × shape facet pages (e.g. "2-carat-round-engagement-rings")
    for (const carat of caratBands) {
      for (const shape of shapes) {
        const slug = this.slugify(`${carat}-carat-${shape}-${base}`)
        if (await this.slugExists(tenantId, slug)) continue
        await this.savePage(tenantId, {
          type: 'facet',
          urlSlug: slug,
          target: base,
          targetRef: `carat:${carat}|shape:${shape}`,
          metaTitle: `${carat} Carat ${this.titleCase(shape)} ${baseLabel} | ${BRAND}`,
          metaDescription:
            `Discover ${carat} carat ${this.titleCase(shape)} ${baseLabel.toLowerCase()} `
            + `handcrafted by ${BRAND}. Ethically sourced diamonds, expert craftsmanship.`,
          h1: `${carat} Carat ${this.titleCase(shape)} ${baseLabel}`,
        })
        count++
      }
    }

    // metal × base facet pages (e.g. "white-gold-engagement-rings")
    for (const metal of metals) {
      const slug = this.slugify(`${metal}-${base}`)
      if (await this.slugExists(tenantId, slug)) continue
      await this.savePage(tenantId, {
        type: 'facet',
        urlSlug: slug,
        target: base,
        targetRef: `metal:${metal}`,
        metaTitle: `${this.titleCase(metal)} ${baseLabel} | ${BRAND}`,
        metaDescription:
          `Browse ${this.titleCase(metal)} ${baseLabel.toLowerCase()} from ${BRAND}. `
          + `Timeless designs in premium ${this.titleCase(metal).toLowerCase()}.`,
        h1: `${this.titleCase(metal)} ${baseLabel}`,
      })
      count++
    }

    return { generated: count, base }
  }

  // ─── Facet inventory ────────────────────────────────────────────────────────

  // Parse "carat:2|shape:Round Brilliant" / "metal:Gold" into a filter.
  private parseFacet(ref: string) {
    const out: { carat?: number; shape?: string; metal?: string } = {}
    for (const part of String(ref || '').split('|')) {
      const [k, ...rest] = part.split(':')
      const v = rest.join(':').trim()
      if (!v) continue
      if (k === 'carat' && Number.isFinite(Number(v))) out.carat = Number(v)
      if (k === 'shape') out.shape = v
      if (k === 'metal') out.metal = v
    }
    return out
  }

  // Purchasable products matching a facet page: active, has media, an
  // engagement ring, and offering the facet's shape / carat band / metal.
  private facetQuery(tenantId: string, page: SeoPage): SelectQueryBuilder<Product> {
    const f = this.parseFacet(page.targetRef)
    const qb = this.products
      .createQueryBuilder('p')
      .where('p.tenant_id = :tenantId', { tenantId })
      .andWhere('p.is_deleted = false')
      .andWhere("p.status = 'active'")
      .andWhere("COALESCE(TRIM(p.product_name), '') <> ''")
      .andWhere('EXISTS (SELECT 1 FROM jeos_product_media pm WHERE pm.product_id = p.id)')
      .andWhere("LOWER(p.category) LIKE 'ring%'")
      .andWhere(
        "(LOWER(COALESCE(p.collection_name,'')) LIKE '%engagement%' OR LOWER(COALESCE(p.sub_category,'')) LIKE '%solitaire%' OR LOWER(COALESCE(p.sub_category,'')) LIKE '%engagement%' OR LOWER(p.product_name) LIKE '%engagement%')",
      )
    if (f.shape) {
      // "Round Brilliant" facet should match products stored as "Round".
      const word = f.shape.toLowerCase().split(/\s+/)[0]
      qb.andWhere(
        "(LOWER(COALESCE(p.center_stone_shape, p.diamond_shape, '')) LIKE :shape)",
        { shape: `${word}%` },
      )
    }
    if (f.carat != null) {
      const arr = "CASE WHEN jsonb_typeof(p.metadata->'weightMatrix') = 'array' THEN p.metadata->'weightMatrix' ELSE '[]'::jsonb END"
      qb.andWhere(
        `(EXISTS (SELECT 1 FROM jsonb_array_elements(${arr}) w WHERE (w->>'carat') ~ '^[0-9.]+$' AND (w->>'carat')::numeric >= :lo AND (w->>'carat')::numeric < :hi)
          OR (COALESCE(p.center_stone_weight_ct, 0) >= :lo AND COALESCE(p.center_stone_weight_ct, 0) < :hi))`,
        { lo: f.carat, hi: f.carat + 1 },
      )
    }
    if (f.metal) {
      const arr = "CASE WHEN jsonb_typeof(p.metadata->'metalOptions') = 'array' THEN p.metadata->'metalOptions' ELSE '[]'::jsonb END"
      qb.andWhere(
        `(LOWER(COALESCE(p.metal_type,'')) = LOWER(:metal) OR EXISTS (SELECT 1 FROM jsonb_array_elements(${arr}) m WHERE LOWER(m->>'type') = LOWER(:metal)))`,
        { metal: f.metal },
      )
    }
    return qb
  }

  async facetProducts(tenantId: string, page: SeoPage, limit = 24) {
    return this.facetQuery(tenantId, page).orderBy('p.created_at', 'DESC').take(limit).getMany()
  }

  private facetIntro(page: SeoPage, count: number): string {
    const f = this.parseFacet(page.targetRef)
    const shapeKey = (f.shape || '').toLowerCase().split(/\s+/)[0]
    if (f.metal) {
      const metal = this.titleCase(f.metal)
      return `${metal} lab-grown diamond engagement rings from ${BRAND}. ${METAL_NOTES[f.metal.toLowerCase()] || ''} `
        + `There ${count === 1 ? 'is 1 design' : `are ${count} designs`} here today; every centre diamond's colour and clarity can be chosen on the product page, and the price updates as you choose.`
    }
    const shape = this.titleCase(f.shape || '')
    return `Engagement rings that can be made with a ${f.carat}-carat ${shape.toLowerCase()} lab-grown centre diamond. `
      + `${SHAPE_NOTES[shapeKey] || ''} `
      + `${count === 1 ? 'This design' : `Each of these ${count} designs`} can be configured in your preferred gold or silver, with the diamond's carat, colour and clarity selected on the product page and priced live.`
  }

  // Keep facet landing pages honest: unpublish + noindex facets with no
  // purchasable inventory (or outside the approved metal assortment), and give
  // the remaining ones unique intro copy. Never deletes rows.
  async reconcileFacetPages(tenantId: string) {
    const rows = await this.pages.find({ where: { tenantId, type: 'facet' } })
    const report: Array<{ slug: string; products: number; action: string }> = []
    for (const page of rows) {
      const f = this.parseFacet(page.targetRef)
      const count = await this.facetQuery(tenantId, page).getCount()
      const unsupportedMetal = !!f.metal && !APPROVED_FACET_METALS.includes(f.metal.toLowerCase())
      if (count === 0 || unsupportedMetal) {
        if (page.status !== 'draft' || page.indexable) {
          page.status = 'draft'
          page.indexable = false
          await this.pages.save(page)
        }
        report.push({ slug: page.urlSlug, products: count, action: unsupportedMetal ? 'unpublished (metal not in assortment)' : 'unpublished (no inventory)' })
        continue
      }
      let changed = false
      if (page.status !== 'published' || !page.indexable) {
        page.status = 'published'
        page.indexable = true
        changed = true
      }
      if (!page.introMd?.trim()) {
        page.introMd = this.facetIntro(page, count)
        changed = true
      }
      if (page.canonicalTo && page.canonicalTo.trim() === '') page.canonicalTo = null as any
      if (changed) {
        page.lastmod = new Date()
        await this.pages.save(page)
      }
      report.push({ slug: page.urlSlug, products: count, action: changed ? 'published + intro' : 'ok' })
    }
    return { total: rows.length, published: report.filter((r) => !r.action.startsWith('unpublished')).length, report }
  }

  // ─── schema.org Product + Offer JSON-LD ─────────────────────────────────────

  async schemaForProduct(tenantId: string, productId: string) {
    const product = await this.products.findOne({
      where: { id: productId, tenantId },
      relations: ['media'],
    })
    if (!product) throw new NotFoundException('Product not found')

    const md: Record<string, any> = (product.metadata as any) || {}
    const shopping: Record<string, any> = md.shopping || {}
    const url = `${SITE}/product/${product.id}`

    // Gallery images (main first, unique, capped) so Google/AI see the range.
    const media = Array.isArray((product as any).media) ? (product as any).media : []
    const images = [
      product.mainImageUrl,
      ...media
        .filter((m: any) => (m.mediaType || 'image') === 'image')
        .map((m: any) => m.fileUrl || m.url),
    ].filter(Boolean)
    const uniqueImages = [...new Set(images)].slice(0, 10)

    // Live engine price (honors MRP override) — omitted gracefully on failure.
    let price: number | null = null
    try {
      const priced: any = await this.pricingEngine.calculateForProduct(tenantId, product.id)
      price = Number(priced?.finalPrice) > 0 ? Number(priced.finalPrice) : null
    } catch {
      price = null
    }
    const priceValidUntil = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)

    // Availability: made-to-order jewelry is sellable now → InStock (Google has
    // no made_to_order value; lead time is communicated via shipping settings).
    const availability =
      shopping.availability === 'out_of_stock' || product.status !== 'active'
        ? 'https://schema.org/OutOfStock'
        : shopping.availability === 'preorder'
          ? 'https://schema.org/PreOrder'
          : 'https://schema.org/InStock'

    const material = [product.metalPurity, product.metalColor, product.metalType]
      .filter(Boolean)
      .join(' ')

    // JSON-LD is crawled server-side once per page load — there's no live
    // shopper selection to react to here (unlike the storefront's on-page
    // text), so any {{token}} in admin-authored copy resolves against the
    // product's default/first metal-and-diamond option.
    const tokenCtx = defaultTokenContext(product)
    const resolvedName =
      resolveTokens(product.seoTitle || product.productName, tokenCtx)?.trim()
      || fallbackProductName(product)
    const resolvedDescription =
      resolveTokens(
        product.seoDescription
        || product.shortDescription
        || product.description
        || product.longDescription
        || '',
        tokenCtx,
      )?.trim()
      || fallbackProductDescription(product, resolvedName)

    const schema: Record<string, any> = {
      '@context': 'https://schema.org/',
      '@type': 'Product',
      '@id': url,
      url,
      name: resolvedName,
      sku: product.productCode || product.shopifySku || product.id,
      mpn: product.productCode || product.id,
      description: resolvedDescription,
      brand: { '@type': 'Brand', name: md.brand || BRAND },
      itemCondition: 'https://schema.org/NewCondition',
      offers: {
        '@type': 'Offer',
        url,
        priceCurrency: 'USD',
        ...(price != null ? { price: price.toFixed(2), priceValidUntil } : {}),
        availability,
        itemCondition: 'https://schema.org/NewCondition',
        seller: { '@type': 'Organization', name: BRAND },
      },
    }

    if (uniqueImages.length) schema.image = uniqueImages
    if (product.category) schema.category = `Apparel & Accessories > Jewelry > ${product.category}`
    if (material) schema.material = material
    if (product.metalColor) schema.color = product.metalColor
    if (product.ringSize) schema.size = product.ringSize
    if (product.shopifyTags) schema.keywords = product.shopifyTags
    if (md.gender) schema.audience = {
      '@type': 'PeopleAudience',
      suggestedGender: String(md.gender).toLowerCase(),
    }
    // Shape variants of the same design (per-shape sibling products) — lets
    // Google/AI group them as one product family (item_group_id equivalent).
    if (md.designGroup) {
      schema.isVariantOf = {
        '@type': 'ProductGroup',
        productGroupID: md.designGroup,
        name: md.designGroup,
      }
    }
    // Diamond specifics as typed properties (rich AI-readable attributes).
    const props: Array<Record<string, string>> = []
    const addProp = (name: string, value: any) => {
      if (value !== undefined && value !== null && value !== '') {
        props.push({ '@type': 'PropertyValue', name, value: String(value) } as any)
      }
    }
    addProp('Diamond Shape', product.diamondShape)
    addProp('Diamond Weight (ct)', product.diamondWeightCt)
    addProp('Diamond Quality', product.diamondQuality)
    addProp('Diamond Cut', product.diamondCut)
    addProp('Diamond Color', product.diamondColor)
    addProp('Diamond Clarity', product.diamondClarity)
    addProp('Certification', product.diamondCertLab)
    addProp('Diamond Type', product.diamondType || 'Lab Grown (CVD)')
    addProp('Metal', material)
    addProp('Net Weight (g)', product.netWeightG)
    if (props.length) schema.additionalProperty = props

    // GEO/AEO: per-product FAQs (admin/AI-authored, metadata.faqs) surfaced as
    // real FAQPage structured data — resolving any tokens the same way as above.
    const faqs: Array<{ question?: string; answer?: string }> = Array.isArray(md.faqs) ? md.faqs : []
    const faqEntities = faqs
      .filter((f) => f?.question && f?.answer)
      .map((f) => ({
        '@type': 'Question',
        name: resolveTokens(f.question, tokenCtx),
        acceptedAnswer: {
          '@type': 'Answer',
          text: resolveTokens(f.answer, tokenCtx),
        },
      }))

    if (!faqEntities.length) return schema

    const { '@context': _drop, ...productNode } = schema
    return {
      '@context': 'https://schema.org/',
      '@graph': [
        productNode,
        {
          '@type': 'FAQPage',
          '@id': `${url}#faq`,
          mainEntity: faqEntities,
        },
      ],
    }
  }


  // ─── Sitemap ────────────────────────────────────────────────────────────────

  // Every indexable storefront URL the API knows about, as site-relative
  // paths: SEO landing pages and collections (both served at /collections/:slug),
  // live products and published blog posts. Static routes are added by the
  // storefront's sitemap.xml route.
  async sitemap(tenantId: string) {
    const out: Array<{ loc: string; lastmod: Date | null; priority: number }> = []
    const seen = new Set<string>()
    const push = (loc: string, lastmod: any, priority: number) => {
      if (seen.has(loc)) return
      seen.add(loc)
      out.push({ loc, lastmod: lastmod ?? null, priority })
    }

    const cols = await this.collections.find({ where: { tenantId, status: 'active' } as any })
    for (const c of cols) {
      const live = await this.products
        .createQueryBuilder('p')
        .where('p.tenant_id = :tenantId', { tenantId })
        .andWhere('p.is_deleted = false')
        .andWhere("p.status = 'active'")
        .andWhere('EXISTS (SELECT 1 FROM jeos_product_media pm WHERE pm.product_id = p.id)')
        .andWhere(
          Array.isArray(c.productIds) && c.productIds.length
            ? '(p.id IN (:...ids) OR LOWER(p.collection_name) = LOWER(:cname))'
            : 'LOWER(p.collection_name) = LOWER(:cname)',
          { ids: c.productIds, cname: c.name },
        )
        .getCount()
      if (live > 0) push(`/collections/${c.slug}`, c.updatedAt, 0.8)
    }

    const pages = await this.pages.find({
      where: { tenantId, indexable: true, status: 'published' },
      order: { priority: 'DESC' },
    })
    for (const p of pages) {
      push(`/collections/${this.normalizeSlug(p.urlSlug)}`, p.lastmod || p.updatedAt || p.createdAt, Number(p.priority) || 0.5)
    }

    const live = await this.products
      .createQueryBuilder('p')
      .select(['p.id', 'p.updatedAt'])
      .where('p.tenant_id = :tenantId', { tenantId })
      .andWhere('p.is_deleted = false')
      .andWhere("p.status = 'active'")
      .andWhere("COALESCE(TRIM(p.product_name), '') <> ''")
      .andWhere('EXISTS (SELECT 1 FROM jeos_product_media pm WHERE pm.product_id = p.id)')
      .getMany()
    for (const p of live) push(`/product/${p.id}`, p.updatedAt, 0.6)

    const blogs = await this.blogs.find({ where: { tenantId, isPublished: true } as any })
    for (const b of blogs) push(`/blog/${b.slug}`, b.updatedAt || b.publishedAt, 0.5)

    return out
  }

  // ─── Redirects ──────────────────────────────────────────────────────────────

  listRedirects(tenantId: string) {
    return this.redirects.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    })
  }

  createRedirect(tenantId: string, body: any, createdBy?: string) {
    const redirect = this.redirects.create({
      fromSlug: this.normalizeSlug(body?.fromSlug ?? ''),
      toSlug: this.normalizeSlug(body?.toSlug ?? ''),
      code: body?.code ?? 301,
      tenantId,
      createdBy,
    } as Partial<SeoRedirect>)
    return this.redirects.save(redirect)
  }

  async removeRedirect(tenantId: string, id: string) {
    const redirect = await this.redirects.findOne({ where: { id, tenantId } })
    if (!redirect) throw new NotFoundException('Redirect not found')
    await this.redirects.remove(redirect)
    return { deleted: true, id }
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private async slugExists(tenantId: string, slug: string) {
    const existing = await this.pages.findOne({ where: { tenantId, urlSlug: slug } })
    return !!existing
  }

  private savePage(tenantId: string, data: Partial<SeoPage>) {
    const page = this.pages.create({
      indexable: true,
      status: 'published',
      priority: 0.5,
      lastmod: new Date(),
      ...data,
      tenantId,
    })
    return this.pages.save(page)
  }

  private slugify(value: string): string {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }

  private normalizeSlug(value: string): string {
    return (value || '').toString().trim().replace(/^\/+|\/+$/g, '')
  }

  private titleCase(value: string): string {
    return (value || '')
      .split(/[\s-]+/)
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
  }

  private titleFromSlug(slug: string): string {
    return this.titleCase((slug || '').replace(/-/g, ' '))
  }
}

// A product with no admin-entered name still needs a truthful title wherever
// it is shown (PDP h1, <title>, Product schema): build one from its attributes.
export function fallbackProductName(p: Partial<Product>): string {
  const shape = (p as any).centerStoneShape || p.diamondShape
  const category = (p.category || 'Jewelry').replace(/s$/i, '')
  const parts = [shape, 'Lab-Grown Diamond', category].filter(Boolean)
  const code = p.productCode ? ` ${p.productCode}` : ''
  return `${parts.join(' ')}${code}`.trim()
}

export function fallbackProductDescription(p: Partial<Product>, name: string): string {
  const metals = Array.isArray((p.metadata as any)?.metalOptions)
    ? ((p.metadata as any).metalOptions as any[]).map((m) => m?.type).filter(Boolean)
    : [p.metalType].filter(Boolean)
  const metalText = metals.length ? ` Available in ${[...new Set(metals)].join(' and ').toLowerCase()}.` : ''
  return `${name} by ${BRAND}, set with lab-grown diamonds.${metalText}`
}
