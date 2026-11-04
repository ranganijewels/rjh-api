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
} from '@nestjs/common'
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

    const order = await this.orderRepo.findOne({ where: { orderNumber: orderId } })
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
        const { orderStatus } = await this.cashfree.getOrderStatus(order.orderNumber)
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
}
