import {
  Controller,
  Post,
  Get,
  Req,
  Res,
  Headers,
  Param,
  Query,
  UseGuards,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectRepository } from '@nestjs/typeorm'
import { Not, Repository } from 'typeorm'
import { Request, Response } from 'express'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { Order } from '../../database/entities/order.entity'
import { MarketingService } from '../marketing/marketing.service'
import { Public } from '../../common/decorators/public.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { CashfreeService } from './services/cashfree.service'
import { CartAccessGuard } from '../../common/guards/cart-access.guard'
import { EmailService } from '../../infrastructure/email/email.service'

/**
 * Cashfree order ids: the shop order number, or "<orderNumber>-R<id>" for a
 * pay-again attempt (Cashfree won't reuse an expired order id). Both map back
 * to the same shop order.
 */
export const baseOrderNumber = (cfOrderId: string) => String(cfOrderId || '').replace(/-R[0-9a-z]+$/i, '')

@ApiTags('Payments')
@Controller('payments/cashfree')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name)

  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    private readonly cashfree: CashfreeService,
    private readonly marketing: MarketingService,
    private readonly email: EmailService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Records a payment result from either the webhook or the status re-check.
   * A paid order is never moved back (Cashfree also reports earlier failed
   * attempts, which can arrive after the success). The switch to Paid is a
   * single conditional update, so when the webhook and the status check race,
   * only one of them confirms the order and sends the email and Purchase event.
   */
  private async applyPaymentResult(order: Order, result: 'PAID' | 'FAILED', cfPaymentId?: string) {
    if (order.paymentStatus === 'Paid') return
    if (result === 'PAID') {
      const { affected } = await this.orderRepo.update(
        { id: order.id, paymentStatus: Not('Paid') },
        {
          paymentStatus: 'Paid',
          orderStatus: order.orderStatus === 'Pending' ? 'Confirmed' : order.orderStatus,
          cfPaymentId: cfPaymentId || order.cfPaymentId,
        },
      )
      if (!affected) return // the other path confirmed it first
      Object.assign(order, { paymentStatus: 'Paid', orderStatus: order.orderStatus === 'Pending' ? 'Confirmed' : order.orderStatus })
      void this.marketing.sendPurchase(order.id)
      this.email.sendOrderConfirmationForOrder(order).catch(() => undefined)
      return
    }
    // FAILED / USER_DROPPED / EXPIRED: leave orderStatus alone so the order
    // stays visible to staff and the customer can try again.
    await this.orderRepo.update(
      { id: order.id, paymentStatus: Not('Paid') },
      { paymentStatus: 'Failed', cfPaymentId: cfPaymentId || order.cfPaymentId },
    )
    order.paymentStatus = 'Failed'
  }

  // Cashfree calls this directly — no auth, verified by HMAC signature
  // instead. Must stay ahead of any other Order mutation as the single
  // source of truth for payment confirmation (never trust the client
  // redirect alone, since query params can be replayed/guessed).
  @Post('webhook')
  @Public()
  @ApiOperation({ summary: 'Cashfree payment webhook (signature-verified, not customer-facing)' })
  async webhook(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('x-webhook-signature') signature: string,
    @Headers('x-webhook-timestamp') timestamp: string,
    @Res() res: Response,
  ) {
    const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body || {}))
    const verified = this.cashfree.verifyWebhookSignature(rawBody, timestamp, signature)
    if (!verified) {
      this.logger.warn('Cashfree webhook signature verification failed')
      return res.status(400).json({ success: false, message: 'Invalid signature' })
    }

    const body = req.body || {}
    const orderId: string | undefined = body?.data?.order?.order_id
    const paymentStatus: string | undefined = body?.data?.payment?.payment_status
    const cfPaymentId: string | undefined = body?.data?.payment?.cf_payment_id

    if (!orderId) {
      return res.status(200).json({ success: true }) // ack — nothing to do
    }

    const order = await this.orderRepo.findOne({ where: { orderNumber: baseOrderNumber(orderId) } })
    if (!order) {
      this.logger.warn(`Cashfree webhook for unknown order ${orderId}`)
      return res.status(200).json({ success: true }) // ack — avoid Cashfree retry storms
    }

    if (paymentStatus === 'SUCCESS') {
      await this.applyPaymentResult(order, 'PAID', cfPaymentId)
    } else if (paymentStatus) {
      await this.applyPaymentResult(order, 'FAILED', cfPaymentId)
    }

    return res.status(200).json({ success: true })
  }

  // Storefront calls this after the customer returns from Cashfree's
  // checkout, to get an authoritative status (never trust the redirect
  // query params alone). Actively re-checks with Cashfree as a fallback
  // in case the webhook hasn't landed yet.
  // Signed-in customers match on their own id; guests (no account) prove the
  // order with the email used at checkout — the same rule as /track.
  @Get('status/:orderNumber')
  @Public()
  @UseGuards(CartAccessGuard)
  @ApiOperation({ summary: "Get an order's live Cashfree payment status (customer or guest + email)" })
  async status(
    @CurrentUser('id') customerId: string,
    @CurrentUser('isGuest') isGuest: boolean,
    @Param('orderNumber') orderNumber: string,
    @Query('email') email?: string,
  ) {
    // The payment page may return a pay-again id (SF-…-R…): find the shop
    // order by its number, but ask Cashfree about the attempt that was paid.
    const cfOrderId = orderNumber
    orderNumber = baseOrderNumber(orderNumber)
    const order = isGuest
      ? await this.orderRepo.findOne({ where: { orderNumber } })
      : await this.orderRepo.findOne({ where: { orderNumber, customerId } })
    const emailOk =
      !isGuest ||
      (!!email && !!order?.customerEmail && order.customerEmail.trim().toLowerCase() === email.trim().toLowerCase())
    if (!order || !emailOk) {
      throw new NotFoundException('Order not found')
    }

    // Re-check anything not yet paid: a "Failed" order can still be paid by a
    // later attempt on the same Cashfree order, before its webhook lands.
    if (order.paymentStatus !== 'Paid' && order.paymentGateway === 'cashfree') {
      try {
        const { orderStatus } = await this.cashfree.getOrderStatus(cfOrderId)
        if (orderStatus === 'PAID') {
          await this.applyPaymentResult(order, 'PAID')
        } else if (orderStatus === 'EXPIRED' || orderStatus === 'TERMINATED') {
          await this.applyPaymentResult(order, 'FAILED')
        }
      } catch {
        // Cashfree unreachable — fall through and return our last-known status
      }
    }

    return {
      orderNumber: order.orderNumber,
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus,
      totalAmount: order.totalAmount,
    }
  }

  /**
   * Pay again for an unpaid online order (account ▸ Orders). Signed-in
   * customers only, and only their own order. Reuses the Cashfree order while
   * it's still open; once it has expired, opens a new Cashfree order
   * ("<orderNumber>-R<id>") for the same amount and currency.
   */
  @Post('retry/:orderNumber')
  @Public()
  @UseGuards(CartAccessGuard)
  @ApiOperation({ summary: 'Start a new payment for an unpaid online order (customer)' })
  async retry(
    @CurrentUser('id') customerId: string,
    @CurrentUser('isGuest') isGuest: boolean,
    @Param('orderNumber') orderNumber: string,
  ) {
    if (isGuest || !customerId) throw new ForbiddenException('Sign in to pay for this order')
    const order = await this.orderRepo.findOne({ where: { orderNumber: baseOrderNumber(orderNumber), customerId } })
    if (!order) throw new NotFoundException('Order not found')
    if (order.paymentStatus === 'Paid') return { alreadyPaid: true }
    if (String(order.paymentMethod || '').toUpperCase() !== 'ONLINE') {
      throw new BadRequestException('This order is paid on delivery')
    }
    if (/cancel/i.test(order.orderStatus || '')) throw new BadRequestException('This order was cancelled')

    // 1. The original Cashfree order may still be open (or was paid and the
    //    notice never arrived).
    try {
      const { orderStatus, raw } = await this.cashfree.getOrderStatus(order.orderNumber)
      if (orderStatus === 'PAID') {
        await this.applyPaymentResult(order, 'PAID')
        return { alreadyPaid: true }
      }
      if (orderStatus === 'ACTIVE' && raw?.payment_session_id) {
        return { paymentSessionId: raw.payment_session_id, paymentMode: this.cashfree.mode, cfOrderId: order.orderNumber }
      }
    } catch {
      // Unknown or unreachable: fall through to a fresh Cashfree order.
    }

    // 2. A new Cashfree order for the same shop order, amount and currency.
    const storefrontUrl = this.config.get<string>('STOREFRONT_URL') || 'http://localhost:3000'
    const apiUrl = this.config.get<string>('API_PUBLIC_URL') || 'http://localhost:4000'
    const cfOrderId = `${order.orderNumber}-R${Date.now().toString(36)}`
    const result = await this.cashfree.createOrder({
      orderId: cfOrderId,
      orderAmount: Number(order.chargedAmount ?? order.totalAmount) || 0,
      currency: order.currencyCode || 'USD',
      customer: {
        customerId: order.customerId,
        customerName: order.customerName,
        customerEmail: order.customerEmail || '',
        customerPhone: order.customerPhone || '',
      },
      returnUrl: `${storefrontUrl}/cart/payment-status?order_id={order_id}`,
      notifyUrl: `${apiUrl}/api/v1/payments/cashfree/webhook`,
    })
    await this.orderRepo.update(
      { id: order.id, paymentStatus: Not('Paid') },
      { cfPaymentSessionId: result.paymentSessionId, paymentStatus: 'Pending' },
    )
    return { paymentSessionId: result.paymentSessionId, paymentMode: this.cashfree.mode, cfOrderId }
  }
}
