import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Product } from '../../database/entities/product.entity'
import { PricingEngineService } from '../pricing/services/pricing-engine.service'

export interface FeedItem {
  id: string
  title: string
  description: string
  link: string
  image_link: string
  price: string
  brand: string
  condition: string
  availability: string
  google_product_category: string
  mpn: string
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
    })

    const items = await Promise.all(
      products.map(async (product) => {
        const priced = await this.pricingEngine
          .calculateForProduct(tenantId, product.id)
          .catch(() => ({ finalPrice: 0 }))
        const finalPrice = Number((priced as any)?.finalPrice) || 0

        const item: FeedItem = {
          id: product.productCode || product.id,
          title: product.productName || '',
          description: product.description || product.shortDescription || product.productName || '',
          link: 'https://rangani.example/product/' + product.id,
          image_link: product.mainImageUrl || '',
          price: finalPrice + ' USD',
          brand: 'Rangani Jewelry House',
          condition: 'new',
          availability: 'in stock',
          google_product_category: '188',
          mpn: product.productCode || '',
        }
        return item
      }),
    )

    return items
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
    </item>`,
      )
      .join('\n')

    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Rangani Jewelry House</title>
    <link>https://rangani.example</link>
    <description>Rangani Jewelry House product feed</description>
${rows}
  </channel>
</rss>`
  }

  async csv(tenantId: string): Promise<string> {
    const items = await this.buildItems(tenantId)
    const headers = [
      'id',
      'title',
      'description',
      'link',
      'image_link',
      'price',
      'brand',
      'condition',
      'availability',
      'google_product_category',
      'mpn',
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
