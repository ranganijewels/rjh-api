import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as nodemailer from 'nodemailer'
import type { Transporter, TransportOptions } from 'nodemailer'

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name)
  private readonly transporter: Transporter
  private readonly from: string

  constructor(private readonly config: ConfigService) {
    // Reads the `smtp.*` config block (SMTP_HOST/PORT/USER/PASS/… env vars).
    this.from = this.config.get<string>('smtp.from', 'RJ House <noreply@rjhouse.com>')

    const smtpUser = this.config.get<string>('smtp.user')
    if (smtpUser) {
      this.transporter = nodemailer.createTransport({
        host: this.config.get<string>('smtp.host', 'smtp.gmail.com'),
        port: this.config.get<number>('smtp.port', 587),
        secure: this.config.get<boolean>('smtp.secure', false),
        auth: { user: smtpUser, pass: this.config.get<string>('smtp.pass') },
      } as TransportOptions)
      this.logger.log(`SMTP configured — sending real email via ${this.config.get('smtp.host')}`)
    } else {
      // Dev mode: log emails to console instead of sending
      this.transporter = nodemailer.createTransport({ jsonTransport: true })
      this.logger.warn('No SMTP config (set SMTP_USER/SMTP_PASS) — emails logged to console only')
    }
  }

  /**
   * Send a generic email.
   */
  async sendMail(to: string, subject: string, html: string): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.from,
        to,
        subject,
        html,
      })
      this.logger.log(`Email sent to ${to} — subject: "${subject}"`)
    } catch (err) {
      this.logger.warn(`Email not sent to ${to} (${subject}) — ${err.message}`)
      // Never crash the app over email failure
    }
  }

  /**
   * Send a branded order confirmation email with order details.
   */
  async sendOrderConfirmation(
    to: string,
    orderNumber: string,
    customerName: string,
    details?: {
      total?: number
      paymentMethod?: string
      productName?: string
      shippingAddress?: string
    },
  ): Promise<void> {
    if (!to) return
    const subject = `Your Rangani order is confirmed — ${orderNumber}`
    const money =
      details?.total != null
        ? `$${Number(details.total).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : ''
    const rows = [
      ['Order number', orderNumber],
      details?.productName ? ['Item', details.productName] : null,
      money ? ['Total', money] : null,
      details?.paymentMethod ? ['Payment', details.paymentMethod.toUpperCase()] : null,
      details?.shippingAddress ? ['Ship to', details.shippingAddress] : null,
    ].filter(Boolean) as [string, string][]

    const rowsHtml = rows
      .map(
        ([k, v]) =>
          `<tr><td style="padding:6px 0;color:#6b7280;">${k}</td><td style="padding:6px 0;text-align:right;color:#111827;font-weight:600;">${v}</td></tr>`,
      )
      .join('')

    const html = `
      <div style="font-family: Georgia, 'Times New Roman', serif; max-width: 600px; margin: 0 auto; color:#111827;">
        <div style="background:#162640;color:#fff;padding:28px 32px;text-align:center;">
          <div style="font-size:22px;letter-spacing:2px;">RANGANI</div>
          <div style="font-size:11px;letter-spacing:3px;opacity:.8;">JEWELRY HOUSE</div>
        </div>
        <div style="padding:32px;">
          <h2 style="font-weight:500;margin:0 0 8px;">Thank you, ${customerName || 'valued customer'} 💎</h2>
          <p style="color:#374151;line-height:1.6;">
            Your order has been confirmed and our artisans are preparing it with care.
            You'll receive a shipping notification with tracking as soon as it's on its way.
          </p>
          <table style="width:100%;border-collapse:collapse;margin:20px 0;font-family:Arial,sans-serif;font-size:14px;">
            ${rowsHtml}
          </table>
          <p style="color:#6b7280;font-size:13px;line-height:1.6;">
            Every Rangani piece is IGI/GIA certified, BIS hallmarked, and backed by our
            lifetime craftsmanship warranty and 30-day easy returns.
          </p>
          <p style="margin-top:24px;">With gratitude,<br/><strong>The Rangani Jewelry House Team</strong></p>
        </div>
        <div style="background:#f3f4f6;padding:16px 32px;text-align:center;color:#9ca3af;font-size:12px;font-family:Arial,sans-serif;">
          Need help? Reply to this email or contact support@therjhouse.com
        </div>
      </div>
    `
    await this.sendMail(to, subject, html)
  }

  /**
   * Send a welcome email to a newly registered user.
   */
  async sendWelcome(to: string, name: string): Promise<void> {
    const subject = `Welcome to RJ House, ${name}!`
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2d2d2d;">Welcome, ${name}!</h2>
        <p>We're thrilled to have you on board. Explore our exclusive jewellery collection and find your perfect piece.</p>
        <p>If you have any questions, our team is always here to help.</p>
        <br />
        <p>Warm regards,<br /><strong>RJ House Team</strong></p>
      </div>
    `
    await this.sendMail(to, subject, html)
  }
}
