import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { SeoPage } from '../../database/entities/seo-page.entity'
import { SeoRedirect } from '../../database/entities/seo-redirect.entity'
import { Product } from '../../database/entities/product.entity'
import { CatalogMaster } from '../../database/entities/catalog-master.entity'

const BRAND = 'Rangani Jewelry House'

@Injectable()
export class SeoService {
  constructor(
    @InjectRepository(SeoPage)
    private readonly pages: Repository<SeoPage>,
    @InjectRepository(SeoRedirect)
    private readonly redirects: Repository<SeoRedirect>,
    @InjectRepository(Product)
    private readonly products: Repository<Product>,
    @InjectRepository(CatalogMaster)
    private readonly masters: Repository<CatalogMaster>,
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
    if (page) return { kind: 'page', page }

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

  // ─── schema.org Product + Offer JSON-LD ─────────────────────────────────────

  async schemaForProduct(tenantId: string, productId: string) {
    const product = await this.products.findOne({
      where: { id: productId, tenantId },
    })
    if (!product) throw new NotFoundException('Product not found')

    const images = [product.mainImageUrl].filter(Boolean) as string[]

    const schema: Record<string, any> = {
      '@context': 'https://schema.org/',
      '@type': 'Product',
      name: product.productName,
      sku: product.productCode || product.shopifySku || product.id,
      description:
        product.shortDescription
        || product.description
        || product.longDescription
        || product.productName,
      brand: {
        '@type': 'Brand',
        name: BRAND,
      },
      offers: {
        '@type': 'Offer',
        priceCurrency: 'USD',
        availability:
          product.status === 'active'
            ? 'https://schema.org/InStock'
            : 'https://schema.org/OutOfStock',
        seller: {
          '@type': 'Organization',
          name: BRAND,
        },
      },
    }

    if (images.length) schema.image = images
    if (product.category) schema.category = product.category

    return schema
  }

  // ─── Sitemap ────────────────────────────────────────────────────────────────

  async sitemap(tenantId: string) {
    const rows = await this.pages.find({
      where: { tenantId, indexable: true, status: 'published' },
      order: { priority: 'DESC' },
    })
    return rows.map((p) => ({
      loc: p.urlSlug,
      lastmod: (p.lastmod || p.updatedAt || p.createdAt) ?? null,
      priority: Number(p.priority),
    }))
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
