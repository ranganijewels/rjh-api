import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as crypto from 'crypto'

export interface CashfreeCustomerDetails {
  customerId: string
  customerName: string
  customerEmail: string
  customerPhone: string
}

export interface CashfreeCreateOrderResult {
  cfOrderId: string
  paymentSessionId: string
  orderStatus: string
}

// Thin wrapper around Cashfree's Payment Gateway REST API (2023-08-01).
// Sandbox vs production is selected purely by CASHFREE_ENV — same App
// ID/Secret shape either way, so nothing else needs to branch on it.
@Injectable()
export class CashfreeService {
  private readonly logger = new Logger(CashfreeService.name)
  private readonly apiVersion = '2023-08-01'

  constructor(private readonly configService: ConfigService) {}

  private get appId(): string {
    return this.configService.get<string>('CASHFREE_APP_ID') || ''
  }

  private get secretKey(): string {
    return this.configService.get<string>('CASHFREE_SECRET_KEY') || ''
  }

  private get baseUrl(): string {
    const env = (this.configService.get<string>('CASHFREE_ENV') || 'sandbox').toLowerCase()
    return env === 'production' ? 'https://api.cashfree.com/pg' : 'https://sandbox.cashfree.com/pg'
  }

  isConfigured(): boolean {
    return !!this.appId && !!this.secretKey
  }

  private headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'x-client-id': this.appId,
      'x-client-secret': this.secretKey,
      'x-api-version': this.apiVersion,
    }
  }

  async createOrder(params: {
    orderId: string
    orderAmount: number
    currency: string
    customer: CashfreeCustomerDetails
    returnUrl: string
    notifyUrl: string
  }): Promise<CashfreeCreateOrderResult> {
    if (!this.isConfigured()) {
      throw new InternalServerErrorException('Cashfree is not configured on the server')
    }
    const res = await fetch(`${this.baseUrl}/orders`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        order_id: params.orderId,
        order_amount: params.orderAmount,
        order_currency: params.currency,
        customer_details: {
          customer_id: params.customer.customerId,
          customer_name: params.customer.customerName || 'Customer',
          customer_email: params.customer.customerEmail,
          customer_phone: params.customer.customerPhone || '9999999999',
        },
        order_meta: {
          return_url: params.returnUrl,
          notify_url: params.notifyUrl,
        },
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      this.logger.error(`Cashfree createOrder failed: ${res.status} ${JSON.stringify(data)}`)
      throw new InternalServerErrorException(data?.message || 'Failed to create Cashfree order')
    }
    return {
      cfOrderId: data.cf_order_id,
      paymentSessionId: data.payment_session_id,
      orderStatus: data.order_status,
    }
  }

  async getOrderStatus(orderId: string): Promise<{ orderStatus: string; raw: any }> {
    if (!this.isConfigured()) {
      throw new InternalServerErrorException('Cashfree is not configured on the server')
    }
    const res = await fetch(`${this.baseUrl}/orders/${encodeURIComponent(orderId)}`, {
      method: 'GET',
      headers: this.headers(),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      this.logger.error(`Cashfree getOrderStatus failed: ${res.status} ${JSON.stringify(data)}`)
      throw new InternalServerErrorException(data?.message || 'Failed to fetch Cashfree order status')
    }
    return { orderStatus: data.order_status, raw: data }
  }

  // Cashfree signs webhooks as base64(HMAC-SHA256(secretKey, timestamp + rawBody)).
  // Must be verified against the EXACT raw bytes Cashfree sent — a re-serialized
  // JSON string can differ in whitespace/key order and silently fail verification.
  verifyWebhookSignature(rawBody: Buffer | string, timestamp: string, signature: string): boolean {
    if (!rawBody || !timestamp || !signature || !this.secretKey) return false
    const payload = timestamp + rawBody.toString()
    const expected = crypto.createHmac('sha256', this.secretKey).update(payload).digest('base64')
    try {
      return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
    } catch {
      return false // length mismatch etc. — treat as not verified
    }
  }
}
