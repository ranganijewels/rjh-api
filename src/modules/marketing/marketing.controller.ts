import { Body, Controller, HttpCode, Post, Req } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { Public } from '../../common/decorators/public.decorator'
import { MarketingService, RELAYABLE_EVENTS } from './marketing.service'

// Tiny in-memory limiter so the public relay can't be used to spam Meta.
const hits = new Map<string, { n: number; t: number }>()
function allowed(ip: string) {
  const now = Date.now()
  const h = hits.get(ip)
  if (!h || now - h.t > 60_000) { hits.set(ip, { n: 1, t: now }); return true }
  h.n++
  return h.n <= 120
}

@ApiTags('marketing')
@Controller('marketing')
export class MarketingController {
  constructor(private readonly marketing: MarketingService) {}

  // Browser events relayed by the storefront (only after consent). The browser
  // pixel sent the same event_id, so Meta de-duplicates the pair.
  @Public()
  @Post('events')
  @HttpCode(202)
  @ApiOperation({ summary: 'Relay a consented storefront event to Meta Conversions API' })
  async relay(@Req() req: any, @Body() b: Record<string, any>) {
    const ip = String(b.ip || req.headers['x-client-ip'] || req.ip || '')
    if (!allowed(ip)) return { accepted: false }
    const name = String(b.event_name || '')
    if (!RELAYABLE_EVENTS.includes(name) || !b.event_id || b.consent !== true) return { accepted: false }
    const cd = b.custom_data && typeof b.custom_data === 'object' ? b.custom_data : {}
    void this.marketing.sendEvent({
      eventName: name,
      eventId: String(b.event_id).slice(0, 80),
      sourceUrl: typeof b.source_url === 'string' ? b.source_url.slice(0, 500) : undefined,
      customData: cd,
      fbp: b.fbp, fbc: b.fbc, ip, userAgent: typeof b.ua === 'string' ? b.ua.slice(0, 300) : req.headers['user-agent'],
    })
    return { accepted: true }
  }
}
