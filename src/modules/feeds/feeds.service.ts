import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Product } from '../../database/entities/product.entity'
import { PricingEngineService } from '../pricing/services/pricing-engine.service'

const SITE = process.env.SITE_URL || 'https://ranganijewelry.com'

// Google product taxonomy ids for jewelry categories.
const GOOGLE_CATEGORY: Record<string, string> = {
  rings: '200',
  'wedding bands': '200',
  necklaces: '196',
  pendants: '193',
  earrings: '194',
  bracelets: '191',
  bangles: '191',
}

export interface FeedItem {
  id: string
  item_group_id: string
  title: string
  description: string
  link: string
  image_link: string
  additional_image_link: string
  price: string
  brand: string
  condition: string
  availability: string
  google_product_category: string
  product_type: string
  mpn: string
  identifier_exists: string
  color: string
  material: string
  size: string
  gender: string
}

@Injectable()
export class FeedService {
  constructor(
    @InjectRepository(Product) private readonly productRepo: Repository<Product>,
    private readonly pricingEngine: PricingEngineService,
  ) {}

  async buildItems(tenantId: string): Promise<FeedItem[]> {
    const products = await this.productRepo.find({
      where: { tenantId, status: 'active', isDeleted: false } as any,
      relations: ['media'],
    })

    const items = await Promise.all(
      products.map(async (product) => {
        const priced = await this.pricingEngine
          .calculateForProduct(tenantId, product.id)
          .catch(() => ({ finalPrice: 0 }))
        const finalPrice = Number((priced as any)?.finalPrice) || 0

        const md: Record<string, any> = (product.metadata as any) || {}
        const shopping: Record<string, any> = md.shopping || {}
        const media = Array.isArray((product as any).media) ? (product as any).media : []
        const extraImages = [
          ...new Set(
            media
              .filter((m: any) => (m.mediaType || 'image') === 'image')
              .map((m: any) => m.fileUrl || m.url)
              .filter((u: string) => u && u !== product.mainImageUrl),
          ),
        ].slice(0, 10)
        const catKey = String(product.category || '').toLowerCase()
        // Made-to-order jewelry: Google has no made_to_order value — the
        // standard mapping is "in stock" + handling time in Merchant settings.
        const availability =
          shopping.availability === 'out_of_stock'
            ? 'out of stock'
            : shopping.availability === 'preorder'
              ? 'preorder'
              : 'in stock'
        const material = [product.metalPurity, product.metalColor, product.metalType]
          .filter(Boolean)
          .join(' ')

        const item: FeedItem = {
          id: product.productCode || product.id,
          item_group_id: md.designGroup || '',
          title: product.seoTitle || product.productName || '',
          description:
            product.seoDescription
            || product.description
            || product.shortDescription
            || product.productName
            || '',
          link: `${SITE}/product/${product.id}`,
          image_link: product.mainImageUrl || '',
          additional_image_link: extraImages.join(','),
          price: finalPrice + ' USD',
          brand: md.brand || 'Rangani Jewelry House',
          condition: 'new',
          availability,
          google_product_category:
            shopping.googleProductCategory || GOOGLE_CATEGORY[catKey] || '188',
          product_type: product.category
            ? `Jewelry > ${product.category}${product.subCategory ? ' > ' + product.subCategory : ''}`
            : 'Jewelry',
          mpn: product.productCode || '',
          // Handmade jewelry without GTIN/barcode: Brand+MPN with
          // identifier_exists=no is the Google-sanctioned combination.
          identifier_exists: shopping.gtin ? 'yes' : 'no',
          color: product.metalColor || '',
          material,
          size: product.ringSize || '',
          gender: md.gender ? String(md.gender).toLowerCase() : '',
        }
        return item
      }),
    )

    // Only items a shopper can actually see and buy: Meta/Google reject items
    // without a title, an image or a price, and unnamed drafts are hidden on the
    // storefront too. Item ids stay equal to the RJH product code.
    return items.filter((i) => i.title.trim() && i.image_link && parseFloat(i.price) > 0)
  }

  // RSS 2.0 feed with the Google Merchant `g:` namespace.
  async googleXml(tenantId: string): Promise<string> {
    const items = await this.buildItems(tenantId)
    const rows = items
      .map(
        (it) => `    <item>
      <g:id>${this.xml(it.id)}</g:id>
      <title>${this.xml(it.title)}</title>
      <description>${this.xml(it.description)}</description>
      <link>${this.xml(it.link)}</link>
      <g:image_link>${this.xml(it.image_link)}</g:image_link>
      <g:price>${this.xml(it.price)}</g:price>
      <g:brand>${this.xml(it.brand)}</g:brand>
      <g:condition>${this.xml(it.condition)}</g:condition>
      <g:availability>${this.xml(it.availability)}</g:availability>
      <g:google_product_category>${this.xml(it.google_product_category)}</g:google_product_category>
      <g:mpn>${this.xml(it.mpn)}</g:mpn>
      <g:identifier_exists>${this.xml(it.identifier_exists)}</g:identifier_exists>
      <g:product_type>${this.xml(it.product_type)}</g:product_type>${it.item_group_id ? `
      <g:item_group_id>${this.xml(it.item_group_id)}</g:item_group_id>` : ''}${it.additional_image_link ? `
      <g:additional_image_link>${this.xml(it.additional_image_link)}</g:additional_image_link>` : ''}${it.color ? `
      <g:color>${this.xml(it.color)}</g:color>` : ''}${it.material ? `
      <g:material>${this.xml(it.material)}</g:material>` : ''}${it.size ? `
      <g:size>${this.xml(it.size)}</g:size>` : ''}${it.gender ? `
      <g:gender>${this.xml(it.gender)}</g:gender>` : ''}
    </item>`,
      )
      .join('\n')

    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Rangani Jewelry House</title>
    <link>${SITE}</link>
    <description>Rangani Jewelry House product feed</description>
${rows}
  </channel>
</rss>`
  }

  async csv(tenantId: string): Promise<string> {
    const items = await this.buildItems(tenantId)
    const headers = [
      'id',
      'item_group_id',
      'title',
      'description',
      'link',
      'image_link',
      'additional_image_link',
      'price',
      'brand',
      'condition',
      'availability',
      'google_product_category',
      'product_type',
      'mpn',
      'identifier_exists',
      'color',
      'material',
      'size',
      'gender',
    ]
    const lines = [headers.join(',')]
    for (const it of items) {
      lines.push(
        headers
          .map((h) => this.csvCell((it as any)[h]))
          .join(','),
      )
    }
    return lines.join('\n')
  }

  private xml(value: any): string {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
  }

  private csvCell(value: any): string {
    const s = String(value ?? '')
    if (/[",\n\r]/.test(s)) {
      return '"' + s.replace(/"/g, '""') + '"'
    }
    return s
  }
}
