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
import { Repository } from 'typeorm'
import { Request, Response } from 'express'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { Order } from '../../database/entities/order.entity'
import { MarketingService } from '../marketing/marketing.service'
import { Public } from '../../common/decorators/public.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { CashfreeService } from './services/cashfree.service'
import { CartAccessGuard } from '../../common/guards/cart-access.guard'

@ApiTags('Payments')
@Controller('payments/cashfree')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name)

  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    private readonly cashfree: CashfreeService,
    private readonly marketing: MarketingService,
  ) {}

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
      order.paymentStatus = 'Paid'
      order.orderStatus = order.orderStatus === 'Pending' ? 'Confirmed' : order.orderStatus
      order.cfPaymentId = cfPaymentId || order.cfPaymentId
    } else if (paymentStatus) {
      // FAILED / USER_DROPPED / etc. — leave orderStatus alone so the
      // customer can retry payment on the same order instead of losing it.
      order.paymentStatus = 'Failed'
      order.cfPaymentId = cfPaymentId || order.cfPaymentId
    }
    await this.orderRepo.save(order)
    if (order.paymentStatus === 'Paid') void this.marketing.sendPurchase(order.id)

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

    if (order.paymentStatus === 'Pending' && order.paymentGateway === 'cashfree') {
      try {
        const { orderStatus } = await this.cashfree.getOrderStatus(order.orderNumber)
        if (orderStatus === 'PAID') {
          order.paymentStatus = 'Paid'
          order.orderStatus = order.orderStatus === 'Pending' ? 'Confirmed' : order.orderStatus
          await this.orderRepo.save(order)
          void this.marketing.sendPurchase(order.id)
        } else if (orderStatus === 'EXPIRED' || orderStatus === 'TERMINATED') {
          order.paymentStatus = 'Failed'
          await this.orderRepo.save(order)
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
