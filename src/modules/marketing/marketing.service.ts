import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Repository } from 'typeorm'
import { createHash } from 'crypto'
import { Order } from '../../database/entities/order.entity'
import { Product } from '../../database/entities/product.entity'

const GRAPH = 'https://graph.facebook.com/v21.0'

// Events the browser may relay through /marketing/events. Purchase is NOT here —
// it is only ever sent from confirmed order/payment state on the server.
export const RELAYABLE_EVENTS = [
  'PageView', 'ViewContent', 'Search', 'AddToWishlist', 'AddToCart', 'InitiateCheckout',
  'AddPaymentInfo', 'Lead', 'Contact', 'Schedule', 'CustomizeProduct',
]

export interface CapiInput {
  eventName: string
  eventId: string
  eventTime?: number
  sourceUrl?: string
  customData?: Record<string, any>
  email?: string | null
  phone?: string | null
  fbp?: string | null
  fbc?: string | null
  ip?: string | null
  userAgent?: string | null
}

const sha = (v: string) => createHash('sha256').update(v).digest('hex')
const clip = (v: any, n: number) => (typeof v === 'string' ? v.slice(0, n) : undefined)

@Injectable()
export class MarketingService {
  private readonly logger = new Logger(MarketingService.name)

  constructor(
    @InjectRepository(Order) private readonly orderRepo: Repository<Order>,
    @InjectRepository(Product) private readonly productRepo: Repository<Product>,
  ) {}

  private get pixelId() { return process.env.META_PIXEL_ID || '908958868657368' }
  private get token() { return process.env.META_CAPI_TOKEN || '' }

  /** Keep only known, short, non-sensitive attribution fields from a client payload. */
  static sanitize(raw: any): Record<string, any> | null {
    if (!raw || typeof raw !== 'object') return null
    const touch = (t: any) =>
      t && typeof t === 'object'
        ? Object.fromEntries(
            ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid', 'referrer', 'landing', 'ts']
              .filter((k) => t[k] != null && t[k] !== '')
              .map((k) => [k, clip(String(t[k]), 300)]),
          )
        : undefined
    const consent = raw.consent === true
    const out: Record<string, any> = {
      first_touch: touch(raw.first_touch),
      last_touch: touch(raw.last_touch),
      event_id: clip(raw.event_id, 80),
      source_url: clip(raw.source_url, 500),
      consent,
    }
    // Browser/device identifiers are stored only when the visitor consented.
    if (consent) {
      out.fbp = clip(raw.fbp, 120)
      out.fbc = clip(raw.fbc, 200)
      out.ip = clip(raw.ip, 64)
      out.ua = clip(raw.ua, 300)
    }
    return out
  }

  async sendEvent(i: CapiInput): Promise<{ sent: boolean; reason?: string }> {
    if (!this.token) return { sent: false, reason: 'no-token' }
    const userData: Record<string, any> = {}
    if (i.email) userData.em = [sha(String(i.email).trim().toLowerCase())]
    if (i.phone) {
      const d = String(i.phone).replace(/\D/g, '')
      if (d.length >= 7) userData.ph = [sha(d)]
    }
    if (i.fbp) userData.fbp = i.fbp
    if (i.fbc) userData.fbc = i.fbc
    if (i.ip) userData.client_ip_address = i.ip
    if (i.userAgent) userData.client_user_agent = i.userAgent

    const body: any = {
      data: [{
        event_name: i.eventName,
        event_time: i.eventTime || Math.floor(Date.now() / 1000),
        event_id: i.eventId,
        action_source: 'website',
        event_source_url: i.sourceUrl,
        user_data: userData,
        custom_data: i.customData || {},
      }],
    }
    if (process.env.META_TEST_EVENT_CODE) body.test_event_code = process.env.META_TEST_EVENT_CODE

    // One retry, reusing the same event_id so Meta never counts it twice.
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const res = await fetch(`${GRAPH}/${this.pixelId}/events?access_token=${encodeURIComponent(this.token)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const json: any = await res.json().catch(() => ({}))
        if (res.ok && !json.error) {
          this.logger.log(`CAPI ${i.eventName} id=${i.eventId} ok (received=${json.events_received})`)
          return { sent: true }
        }
        this.logger.warn(`CAPI ${i.eventName} id=${i.eventId} attempt ${attempt} failed: ${json?.error?.message || res.status}`)
      } catch (e: any) {
        this.logger.warn(`CAPI ${i.eventName} id=${i.eventId} attempt ${attempt} error: ${e?.message}`)
      }
    }
    return { sent: false, reason: 'failed' }
  }

  /** Purchase for a confirmed order — at most once per order. */
  async sendPurchase(orderId: string): Promise<void> {
    try {
      const order = await this.orderRepo.findOne({ where: { id: orderId } })
      if (!order || order.isTest) return
      const m: Record<string, any> = (order as any).marketing || {}
      if (m.capi_purchase_sent) return
      if (m.consent !== true) return // no consent captured → no server-side event
      if (!this.token) return

      const lines: any[] = Array.isArray(order.lineItems) ? (order.lineItems as any[]) : []
      const ids = [...new Set(lines.map((l) => l.productId).filter(Boolean))]
      const prods = ids.length ? await this.productRepo.find({ where: { id: In(ids) } as any }) : []
      const sku = new Map(prods.map((p: any) => [p.id, p.productCode || p.id]))
      const contents = lines.map((l) => ({ id: sku.get(l.productId) || l.productId, quantity: l.quantity || 1, item_price: Number(l.unitPrice) || 0 }))

      const r = await this.sendEvent({
        eventName: 'Purchase',
        eventId: order.orderNumber as string, // matches the browser eventID
        eventTime: Math.floor(new Date(order.createdAt).getTime() / 1000) || undefined,
        sourceUrl: m.source_url,
        customData: {
          value: Number(order.totalAmount) || 0,
          currency: 'USD',
          content_ids: contents.map((c) => c.id),
          contents,
          content_type: 'product',
          num_items: contents.reduce((s, c) => s + (c.quantity || 1), 0),
          order_id: order.orderNumber,
        },
        email: order.customerEmail,
        phone: order.customerPhone,
        fbp: m.fbp, fbc: m.fbc, ip: m.ip, userAgent: m.ua,
      })
      if (r.sent) {
        await this.orderRepo.update({ id: order.id } as any, { marketing: { ...m, capi_purchase_sent: new Date().toISOString() } } as any)
      }
    } catch (e: any) {
      this.logger.warn(`sendPurchase(${orderId}) failed: ${e?.message}`)
    }
  }

  /** Lead / Schedule etc. confirmed by a successful form save. */
  async sendFormEvent(eventName: 'Lead' | 'Schedule', marketing: any, who: { email?: string | null; phone?: string | null }, extra: Record<string, any> = {}) {
    try {
      const m = marketing || {}
      if (m.consent !== true || !m.event_id) return
      await this.sendEvent({
        eventName, eventId: m.event_id, sourceUrl: m.source_url, customData: extra,
        email: who.email, phone: who.phone, fbp: m.fbp, fbc: m.fbc, ip: m.ip, userAgent: m.ua,
      })
    } catch (e: any) {
      this.logger.warn(`sendFormEvent ${eventName} failed: ${e?.message}`)
    }
  }
}
