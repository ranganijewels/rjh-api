import {
  Controller, Get, Post, Body, Param, Query, Headers, UseGuards,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../../common/guards/roles.guard'
import { Public } from '../../../common/decorators/public.decorator'
import { PricingEngineService, PriceAttributes } from '../services/pricing-engine.service'

const T = '00000000-0000-0000-0000-000000000001'

@ApiTags('pricing-engine')
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class PricingController {
  constructor(private readonly engine: PricingEngineService) {}

  // Authoritative price for a stored product (storefront + ERP both use this).
  @Get('pricing/product/:id')
  @Public()
  @ApiOperation({ summary: 'Calculate the live price for a product from master data' })
  forProduct(
    @Headers('x-tenant-id') h: string,
    @Param('id') id: string,
    @Query('country') country?: string,
    @Query('state') state?: string,
    @Query('includeShipping') includeShipping?: string,
  ) {
    return this.engine.calculateForProduct(h || T, id, {
      country,
      state,
      includeShipping: includeShipping === 'true',
    })
  }

  // What-if calculation from a product + overrides (admin price preview).
  @Post(['price-preview', 'pricing/price-preview'])
  @Public()
  @ApiOperation({ summary: 'Preview a product price with optional attribute overrides (no save)' })
  preview(
    @Headers('x-tenant-id') h: string,
    @Body() body: { productId?: string } & Partial<PriceAttributes>,
  ) {
    const { productId, ...overrides } = body
    if (productId) {
      return this.engine.calculateForProduct(h || T, productId, overrides)
    }
    return this.engine.calculate(h || T, overrides)
  }

  // Stateless calculation from raw attributes (no product needed).
  @Post(['calculate-price', 'pricing/calculate-price'])
  @Public()
  @ApiOperation({ summary: 'Calculate a price from raw attributes' })
  calculate(@Headers('x-tenant-id') h: string, @Body() attrs: PriceAttributes) {
    return this.engine.calculate(h || T, attrs)
  }

  // Batch pricing for a list of products (storefront listing — one round-trip).
  @Post('pricing/batch')
  @Public()
  @ApiOperation({ summary: 'Calculate prices for many products at once' })
  async batch(
    @Headers('x-tenant-id') h: string,
    @Body() body: { productIds: string[] } & Partial<PriceAttributes>,
  ) {
    const { productIds = [], ...opts } = body
    const tenant = h || T
    const results = await Promise.all(
      productIds.map(async (id) => {
        try {
          const r = await this.engine.calculateForProduct(tenant, id, opts)
          return { productId: id, finalPrice: r.finalPrice, ok: true }
        } catch {
          return { productId: id, finalPrice: 0, ok: false }
        }
      }),
    )
    // Return both a list and a quick-lookup map.
    const map: Record<string, number> = {}
    results.forEach((r) => (map[r.productId] = r.finalPrice))
    return { results, map }
  }
}
