import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { MarketingService } from '../marketing/marketing.service'
import { Repository } from 'typeorm'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { Cache } from 'cache-manager'
import { Customer, CustomerType } from '../../database/entities/customer.entity'
import { CustomerAddress } from '../../database/entities/customer-address.entity'
import { Order } from '../../database/entities/order.entity'
import { User } from '../../database/entities/user.entity'
import { Product } from '../../database/entities/product.entity'
import { CouponsService } from '../coupons/coupons.service'
import { PricingEngineService } from '../pricing/services/pricing-engine.service'
import { EmailService } from '../../infrastructure/email/email.service'
import { CashfreeService } from '../payments/services/cashfree.service'
import { CurrencyService } from '../currency/currency.service'
import { ConfigService } from '@nestjs/config'
import { createHash } from 'crypto'

interface CartItem {
  // One line per product CONFIGURATION (metal, stone, size, engraving…), so
  // the same design in two configurations stays as two lines.
  lineId?: string
  productId: string
  productName: string
  quantity: number
  price: number
  metadata?: Record<string, any>
}

const CONFIG_KEYS = [
  'metalType', 'metalColor', 'shape', 'centerDiamondWeight', 'ringSize', 'size',
  'clarity', 'color', 'engraving', 'backType',
]

export function cartLineId(productId: string, metadata: Record<string, any> = {}): string {
  const config = CONFIG_KEYS.map((k) => `${k}=${String(metadata?.[k] ?? '').trim().toLowerCase()}`).join('|')
  return createHash('sha1').update(`${productId}|${config}`).digest('hex').slice(0, 16)
}

// Orders placed by staff/QA must not count as revenue. Flag them at creation
// from the internal email domains or an explicit test marker; staff can also
// toggle the flag in admin. Comma-separated TEST_ORDER_EMAIL_DOMAINS extends it.
export function isTestOrder(email: string | null | undefined, dto: { notes?: string } = {}): boolean {
  const domains = ['rjhouse.com', 'therjhouse.com', 'example.com', 'test.com', 'mailinator.com']
    .concat(String(process.env.TEST_ORDER_EMAIL_DOMAINS || '').split(',').map((d) => d.trim().toLowerCase()))
    .filter(Boolean)
  const e = String(email || '').toLowerCase().trim()
  const domain = e.split('@')[1] || ''
  if (domains.includes(domain)) return true
  if (/(^|[^a-z])test([^a-z]|$)/i.test(e.split('@')[0] || '')) return true
  return /\[test\]/i.test(dto.notes || '')
}

// Pricing-engine overrides for a configured cart line — the same mapping the
// storefront uses for the PDP and cart display, so the charged price matches.
export function cartLineOverrides(meta: Record<string, any> = {}): Record<string, any> {
  const overrides: Record<string, any> = {}
  if (meta.metalType) overrides.metalPurity = String(meta.metalType).replace('KT', 'K')
  if (meta.metalColor) overrides.metalColor = meta.metalColor
  const ct = Number(String(meta.centerDiamondWeight ?? '').replace(/[^0-9.]/g, ''))
  // Same key the PDP price uses: the chosen carat is the CENTRE stone weight.
  if (ct > 0) overrides.centerCaratCt = ct
  if (meta.metalTypeName) overrides.metalType = meta.metalTypeName
  if (meta.clarity) overrides.diamondClarity = meta.clarity
  if (meta.color) overrides.diamondColor = meta.color
  return overrides
}

interface Cart {
  items: CartItem[]
  coupon?: { code: string; discount: number; discountType: 'percent' | 'fixed' }
  updatedAt: string
}

interface WishlistItem {
  productId: string
  [key: string]: any
}

export interface CheckoutDto {
  shippingAddressId?: string
  shippingAddress?: Record<string, any>
  paymentMethod?: string
  // ISO currency code the shopper was viewing prices in (e.g. "INR", "USD").
  // totalAmount is always computed in the store's USD base; for online
  // payments this is converted at the live rate before charging, so the
  // amount charged matches the amount the shopper was actually shown.
  currencyCode?: string
  notes?: string
  // Guest checkout only — collected instead of requiring login. An account
  // is created silently (no password) so the order has a real customer
  // record; a returning guest is matched back to it by email.
  guestEmail?: string
  guestName?: string
  guestPhone?: string
  // Attribution + consented match keys captured by the storefront.
  marketing?: Record<string, any>
}

@Injectable()
export class StorefrontService {
  // cache-manager v5 takes the TTL in MILLISECONDS (it was passed as seconds, so carts
  // silently expired after ~10 minutes and wishlists after ~43).
  private readonly CART_TTL = 60 * 60 * 24 * 7 * 1000 // 7 days
  private readonly WISHLIST_TTL = 60 * 60 * 24 * 30 * 1000 // 30 days

  constructor(
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,

    @InjectRepository(CustomerAddress)
    private readonly addressRepo: Repository<CustomerAddress>,

    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,

    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,

    private readonly couponsService: CouponsService,

    private readonly pricingEngine: PricingEngineService,

    private readonly emailService: EmailService,

    private readonly cashfreeService: CashfreeService,

    private readonly currencyService: CurrencyService,

    private readonly configService: ConfigService,

    private readonly marketingService: MarketingService,
  ) {}

  // ─── Cart Helpers ─────────────────────────────────────────────────────────

  private cartKey(customerId: string): string {
    return `cart:${customerId}`
  }

  private wishlistKey(customerId: string): string {
    return `wishlist:${customerId}`
  }

  private async readCart(customerId: string): Promise<Cart> {
    const raw = await this.cacheManager.get<string>(this.cartKey(customerId))
    if (!raw) return { items: [], updatedAt: new Date().toISOString() }
    try {
      return typeof raw === 'string' ? JSON.parse(raw) : (raw as unknown as Cart)
    } catch {
      return { items: [], updatedAt: new Date().toISOString() }
    }
  }

  private async saveCart(customerId: string, cart: Cart): Promise<void> {
    cart.updatedAt = new Date().toISOString()
    await this.cacheManager.set(this.cartKey(customerId), JSON.stringify(cart), this.CART_TTL)
  }

  // ─── Cart ─────────────────────────────────────────────────────────────────

  async getCart(customerId: string): Promise<Cart> {
    return this.withLineIds(await this.readCart(customerId))
  }

  // Lines saved before lineIds existed are keyed by productId.
  private withLineIds(cart: Cart): Cart {
    for (const i of cart.items) if (!i.lineId) i.lineId = cartLineId(i.productId, i.metadata)
    return cart
  }

  private matchesLine(i: CartItem, key: string) {
    return i.lineId === key || (!i.lineId && i.productId === key)
  }

  async addToCart(customerId: string, item: CartItem): Promise<Cart> {
    const cart = this.withLineIds(await this.readCart(customerId))
    const quantity = Math.max(1, Math.floor(Number(item.quantity) || 1))
    const lineId = cartLineId(item.productId, item.metadata)
    const existing = cart.items.find((i) => i.lineId === lineId)
    if (existing) {
      existing.quantity += quantity
    } else {
      cart.items.push({ ...item, quantity, lineId })
    }
    await this.saveCart(customerId, cart)
    return cart
  }

  async updateCartItem(customerId: string, key: string, quantity: number): Promise<Cart> {
    const cart = this.withLineIds(await this.readCart(customerId))
    if (quantity <= 0) {
      cart.items = cart.items.filter((i) => !this.matchesLine(i, key))
    } else {
      const item = cart.items.find((i) => this.matchesLine(i, key))
      if (item) item.quantity = Math.floor(quantity)
    }
    await this.saveCart(customerId, cart)
    return cart
  }

  async removeFromCart(customerId: string, key: string): Promise<Cart> {
    const cart = this.withLineIds(await this.readCart(customerId))
    cart.items = cart.items.filter((i) => !this.matchesLine(i, key))
    await this.saveCart(customerId, cart)
    return cart
  }

  // A shopper who built a bag as a guest and then signs in keeps it: guest
  // lines are folded into the account's cart (same configuration → quantities
  // add up) and the guest cart is cleared.
  async mergeGuestCart(customerId: string, guestId: string): Promise<Cart> {
    if (!guestId || guestId === customerId) return this.withLineIds(await this.readCart(customerId))
    const guest = this.withLineIds(await this.readCart(guestId))
    const cart = this.withLineIds(await this.readCart(customerId))
    if (!guest.items.length) return cart
    for (const g of guest.items) {
      const existing = cart.items.find((i) => i.lineId === g.lineId)
      if (existing) existing.quantity += g.quantity
      else cart.items.push(g)
    }
    if (!cart.coupon && guest.coupon) cart.coupon = guest.coupon
    await this.saveCart(customerId, cart)
    await this.clearCart(guestId)
    return cart
  }

  async applyCartCoupon(
    customerId: string,
    tenantId: string,
    couponCode: string,
  ): Promise<Cart & { couponApplied: boolean; discountAmount?: number; message?: string }> {
    const cart = await this.readCart(customerId)
    const subtotal = cart.items.reduce((s, i) => s + i.price * i.quantity, 0)

    try {
      const { coupon, discount } = await this.couponsService.validate(
        tenantId,
        couponCode,
        subtotal,
      )
      cart.coupon = {
        code: coupon.code,
        discount: Number(coupon.discountValue),
        discountType: coupon.discountType,
      }
      await this.saveCart(customerId, cart)
      return { ...cart, couponApplied: true, discountAmount: discount }
    } catch (e: any) {
      return { ...cart, couponApplied: false, message: e?.message || 'Invalid coupon' }
    }
  }

  async removeCartCoupon(
    customerId: string,
  ): Promise<Cart & { couponRemoved: boolean }> {
    const cart = await this.readCart(customerId)
    delete cart.coupon
    await this.saveCart(customerId, cart)
    return { ...cart, couponRemoved: true }
  }

  /** Absolute discount for a cart given its coupon + subtotal. */
  async clearCart(customerId: string): Promise<void> {
    await this.cacheManager.del(this.cartKey(customerId))
  }

  // ─── Wishlist ─────────────────────────────────────────────────────────────

  private async readWishlist(customerId: string): Promise<WishlistItem[]> {
    const raw = await this.cacheManager.get<string>(this.wishlistKey(customerId))
    if (!raw) return []
    try {
      return typeof raw === 'string' ? JSON.parse(raw) : (raw as unknown as WishlistItem[])
    } catch {
      return []
    }
  }

  async getWishlist(customerId: string): Promise<WishlistItem[]> {
    return this.readWishlist(customerId)
  }

  async toggleWishlist(
    customerId: string,
    productId: string,
    productData: Record<string, any>,
  ): Promise<{ added: boolean; wishlist: WishlistItem[] }> {
    const wishlist = await this.readWishlist(customerId)
    const idx = wishlist.findIndex((i) => i.productId === productId)

    let added: boolean
    if (idx >= 0) {
      wishlist.splice(idx, 1)
      added = false
    } else {
      wishlist.push({ productId, ...productData })
      added = true
    }

    await this.cacheManager.set(
      this.wishlistKey(customerId),
      JSON.stringify(wishlist),
      this.WISHLIST_TTL,
    )
    return { added, wishlist }
  }

  // ─── Checkout ─────────────────────────────────────────────────────────────

  async checkout(
    tenantId: string,
    customerId: string,
    dto: CheckoutDto,
    isGuest = false,
  ): Promise<Order> {
    // The cart lives under whatever identity the shopper checked out with —
    // their guest session id if they were never logged in. Read/clear it
    // with that key; the ORDER, however, must belong to a real Customer row.
    const cartKeyId = customerId
    const cart = await this.readCart(cartKeyId)
    if (!cart.items.length) {
      throw new BadRequestException('Cart is empty')
    }

    let customer: Customer | null = null

    if (isGuest) {
      const email = (dto.guestEmail || '').trim().toLowerCase()
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new BadRequestException('A valid email is required to check out as a guest')
      }
      const a = dto.shippingAddress || {}
      if (!a.name || !a.street || !a.city || !a.country) {
        throw new BadRequestException('A shipping address (name, street, city and country) is required')
      }
      customer = await this.customerRepo.findOne({
        where: { tenantId, email, isDeleted: false },
      })
      if (!customer) {
        customer = await this.customerRepo.save(
          this.customerRepo.create({
            tenantId,
            customerName: dto.guestName || email,
            email,
            phone: dto.guestPhone || '',
            customerCode: `GUEST-${Date.now().toString(36).toUpperCase()}`,
            customerType: CustomerType.RETAIL,
            isActive: true,
          }),
        )
      }
    } else {
      customer = await this.customerRepo.findOne({
        where: { id: customerId, isDeleted: false },
      })

      // Auto-create jeos_customers record for website users on first checkout
      if (!customer) {
        const user = await this.userRepo.findOne({ where: { id: customerId, isActive: true } })
        if (!user) throw new NotFoundException('Customer not found')

        customer = await this.customerRepo.save(
          this.customerRepo.create({
            id: customerId,
            tenantId,
            customerName: user.fullName || user.email,
            email: user.email,
            phone: user.phone || '',
            customerCode: `WEB-${customerId.slice(0, 8).toUpperCase()}`,
            customerType: CustomerType.RETAIL,
            isActive: true,
          }),
        )
      }
    }

    // From here on, orders/Cashfree/emails always use the real customer's id
    // — never the guest session id, which only ever identified the cart.
    const realCustomerId = customer.id

    // Re-price every line item from the Pricing Engine server-side so the order
    // total is authoritative and tamper-proof (never trust the client price).
    // Configured items must be priced WITH their chosen attributes (karat,
    // color, carat) — pricing the product's defaults would charge the wrong amount.
    for (const item of cart.items) {
      try {
        const overrides = cartLineOverrides(item.metadata || {})
        const priced = await this.pricingEngine.calculateForProduct(tenantId, item.productId, overrides)
        if (priced?.finalPrice > 0) item.price = priced.finalPrice
      } catch {
        // keep the existing captured price if the product can't be re-priced
      }
    }

    // Calculate totals — coerce each line defensively so a bad price/qty can
    // never produce a NaN order total (which poisons downstream reports).
    const subtotal = cart.items.reduce((sum, i) => {
      const price = Number(i.price) || 0
      const qty = Number(i.quantity) || 0
      return sum + price * qty
    }, 0)
    // Re-check the coupon against the authoritative (re-priced) subtotal —
    // dates, usage limit, minimum order and max discount all apply here.
    let discountAmount = 0
    if (cart.coupon?.code) {
      try {
        const { discount } = await this.couponsService.validate(tenantId, cart.coupon.code, subtotal)
        discountAmount = Number(discount) || 0
      } catch (e: any) {
        throw new BadRequestException(
          `Coupon ${cart.coupon.code} can't be used: ${e?.message || 'not valid'}. Remove it from your bag to continue.`,
        )
      }
    }
    const totalAmount = Math.max(0, subtotal - discountAmount)
    if (!Number.isFinite(totalAmount)) {
      throw new BadRequestException('Could not compute a valid order total')
    }

    // Use first item as the primary product (simple order model)
    const firstItem = cart.items[0]
    const firstMeta = firstItem.metadata || {}
    const orderNumber = `SF-${Date.now()}`
    const purity = firstMeta.metalType ? String(firstMeta.metalType).replace('KT', 'K') : ''
    const firstCt = Number(String(firstMeta.centerDiamondWeight ?? '').replace(/[^0-9.]/g, '')) || null
    const addr = dto.shippingAddress
    const addressText = addr
      ? [addr.name, addr.street, addr.city, addr.state, addr.pincode, addr.country, addr.phone]
          .filter(Boolean)
          .join(', ')
      : ''

    // Online payment: create the Cashfree session BEFORE touching the DB or
    // cart, so a Cashfree failure aborts cleanly — the customer keeps their
    // cart and can just retry, instead of being left with an orphaned order
    // they can never pay for.
    const isOnline = (dto.paymentMethod || 'COD').toUpperCase() === 'ONLINE'
    let cfSession: { cfOrderId: string; paymentSessionId: string } | null = null
    // totalAmount is always USD (the store's base currency). Convert to
    // whatever currency the shopper was actually shown before charging them —
    // this is the fix for the bug where the checkout total displayed e.g.
    // "₹423" (just a re-labeled USD figure, not a real conversion) and then
    // Cashfree was always billed in INR regardless of the shown currency.
    let chargeCurrency = 'USD'
    let chargeAmount = totalAmount
    if (isOnline) {
      const requestedCode = (dto.currencyCode || 'USD').toUpperCase()
      const currencyRow =
        requestedCode === 'USD'
          ? null
          : (await this.currencyService.listActive(tenantId)).find((c) => c.currencyCode === requestedCode)
      const rate = currencyRow ? Number(currencyRow.rate) || 1 : 1
      chargeCurrency = currencyRow ? currencyRow.currencyCode : 'USD'
      chargeAmount = Math.round(totalAmount * rate * 100) / 100

      const storefrontUrl = this.configService.get<string>('STOREFRONT_URL') || 'http://localhost:3000'
      const apiUrl = this.configService.get<string>('API_PUBLIC_URL') || 'http://localhost:4000'
      const result = await this.cashfreeService.createOrder({
        orderId: orderNumber,
        orderAmount: chargeAmount,
        currency: chargeCurrency,
        customer: {
          customerId: realCustomerId,
          customerName: customer.customerName,
          customerEmail: customer.email || '',
          customerPhone: customer.phone || '',
        },
        returnUrl: `${storefrontUrl}/cart/payment-status?order_id={order_id}`,
        notifyUrl: `${apiUrl}/api/v1/payments/cashfree/webhook`,
      })
      cfSession = { cfOrderId: result.cfOrderId, paymentSessionId: result.paymentSessionId }
    }

    // Every line with its full configuration, so fulfilment sees exactly what
    // was chosen (stone, metal, size, engraving, earring back…), not just the
    // first item.
    const lineItems = cart.items.map((i) => ({
      lineId: i.lineId || cartLineId(i.productId, i.metadata),
      productId: i.productId,
      productName: i.productName,
      quantity: Number(i.quantity) || 1,
      unitPrice: Number(i.price) || 0,
      lineTotal: (Number(i.price) || 0) * (Number(i.quantity) || 1),
      metalPurity: i.metadata?.metalType ? String(i.metadata.metalType).replace('KT', 'K') : null,
      metalColor: i.metadata?.metalColor || null,
      diamondShape: i.metadata?.shape || null,
      centerDiamondWeight: i.metadata?.centerDiamondWeight || null,
      diamondColor: i.metadata?.color || null,
      diamondClarity: i.metadata?.clarity || null,
      ringSize: i.metadata?.ringSize || null,
      size: i.metadata?.size || null,
      engraving: i.metadata?.engraving || null,
      backType: i.metadata?.backType || null,
      image: i.metadata?.image || null,
    }))

    // Per-product dispatch time (product form "Production & dispatch time"),
    // shown on each line of the confirmation email.
    const productionTimes: Record<string, string> = {}
    for (const l of lineItems) {
      try {
        const p = await this.productRepo.findOne({ where: { id: l.productId, tenantId } as any })
        const t = String((p?.metadata as any)?.productionTime || '').trim()
        if (t) productionTimes[l.productId] = t
      } catch {
        /* default timeline */
      }
    }

    const order = this.orderRepo.create({
      tenantId,
      orderNumber,
      lineItems,
      isTest: isTestOrder(customer.email, dto),
      customerId: realCustomerId,
      customerName: customer.customerName,
      customerPhone: customer.phone || '',
      customerEmail: customer.email || '',
      customerAddress: addressText,
      productId: firstItem.productId,
      productName: firstItem.productName,
      productCode: firstItem.productId,
      productImageUrl: firstMeta.image || '',
      designName: '',
      designCode: '',
      metalType: /\d+K/i.test(purity) ? 'Gold' : '',
      metalPurity: purity,
      metalColor: firstMeta.metalColor || '',
      diamondShape: firstMeta.shape || '',
      diamondQuality: firstMeta.clarity || '',
      diamondWeightCt: firstCt,
      productSize: firstMeta.ringSize || firstMeta.size || '',
      quantity: firstItem.quantity,
      totalAmount,
      orderStatus: 'Pending',
      paymentStatus: 'Pending',
      paymentMethod: isOnline ? 'ONLINE' : 'COD',
      paymentGateway: isOnline ? 'cashfree' : null,
      cfPaymentSessionId: cfSession?.paymentSessionId || null,
      currencyCode: isOnline ? chargeCurrency : 'USD',
      chargedAmount: isOnline ? chargeAmount : null,
      orderNotes: [dto.notes, cart.coupon?.code && `Coupon ${cart.coupon.code} (−$${discountAmount.toFixed(2)})`]
        .filter(Boolean)
        .join(' · '),
      marketing: MarketingService.sanitize(dto.marketing),
      channel: 'storefront',
      orderDate: new Date().toISOString().slice(0, 10),
    })

    const saved = await this.orderRepo.save(order)
    // Cash-on-delivery orders are confirmed the moment they are placed; online
    // orders send Purchase from the payment confirmation instead.
    if (!isOnline) void this.marketingService.sendPurchase(saved.id)
    await this.clearCart(cartKeyId)
    if (cart.coupon?.code) {
      await this.couponsService.incrementUse(tenantId, cart.coupon.code).catch(() => undefined)
    }

    // Fire-and-forget order confirmation email (no-op / console-log in dev
    // until SMTP env vars are set; never blocks or fails checkout).
    this.emailService
      .sendOrderConfirmation(customer.email || '', saved.orderNumber, customer.customerName, {
        total: totalAmount,
        paymentMethod: dto.paymentMethod || 'COD',
        productName: firstItem.productName,
        shippingAddress: addressText,
        lines: lineItems.map((l) => ({
          name: l.productName,
          quantity: l.quantity,
          specs: [
            l.metalPurity && `${l.metalPurity} ${l.metalColor || ''}`.trim(),
            l.diamondShape,
            l.centerDiamondWeight && `${l.centerDiamondWeight} ct`,
            l.diamondColor && `Color ${l.diamondColor}`,
            l.diamondClarity && `Clarity ${l.diamondClarity}`,
            l.ringSize && `Size ${l.ringSize}`,
            l.backType && `${l.backType}`,
            l.engraving && `Engraving “${l.engraving}”`,
          ].filter(Boolean) as string[],
          dispatch: productionTimes[l.productId] || '5–6 business days',
        })),
      })
      .catch(() => undefined)

    return saved
  }

  // ─── Guest order tracking ──────────────────────────────────────────────────

  /**
   * Public order lookup for guests: match an order number to the email it was
   * placed with. Returns a minimal, safe status view (never full PII).
   */
  async trackOrder(orderNumber: string, email: string) {
    const num = (orderNumber || '').trim()
    const mail = (email || '').trim().toLowerCase()
    if (!num || !mail) {
      throw new BadRequestException('Order number and email are required')
    }
    const order = await this.orderRepo.findOne({
      where: { orderNumber: num, isDeleted: false },
    })
    // Verify the email matches to avoid leaking others' order status.
    if (!order || (order.customerEmail || '').trim().toLowerCase() !== mail) {
      throw new NotFoundException('No order found for that number and email')
    }
    return {
      orderNumber: order.orderNumber,
      status: order.orderStatus,
      paymentStatus: order.paymentStatus,
      orderDate: order.orderDate || order.createdAt,
      productName: order.productName,
      totalAmount: Number(order.totalAmount) || 0,
      trackingNumber: order.trackingNumber || null,
      courierName: order.courierName || null,
      trackingUrl: order.trackingUrl || null,
      shippedAt: order.shippedAt || null,
      deliveredAt: order.deliveredAt || null,
    }
  }

  // ─── Addresses ────────────────────────────────────────────────────────────

  private async ensureCustomerExists(customerId: string, tenantId: string): Promise<void> {
    const exists = await this.customerRepo.findOne({ where: { id: customerId } })
    if (!exists) {
      const user = await this.userRepo.findOne({ where: { id: customerId } })
      await this.customerRepo.save(
        this.customerRepo.create({
          id: customerId,
          tenantId,
          customerName: user?.fullName || user?.email || 'Website Customer',
          email: user?.email || '',
          phone: user?.phone || '',
          customerCode: `WEB-${customerId.slice(0, 8).toUpperCase()}`,
          customerType: CustomerType.RETAIL,
          isActive: true,
        }),
      )
    }
  }

  async getAddresses(customerId: string): Promise<CustomerAddress[]> {
    return this.addressRepo.find({ where: { customerId }, order: { createdAt: 'ASC' } })
  }

  async addAddress(customerId: string, tenantId: string, dto: Partial<CustomerAddress>): Promise<CustomerAddress> {
    await this.ensureCustomerExists(customerId, tenantId)
    const count = await this.addressRepo.count({ where: { customerId } })
    const addr = this.addressRepo.create({ ...dto, customerId, isDefault: count === 0 })
    return this.addressRepo.save(addr)
  }

  async updateAddress(customerId: string, addressId: string, dto: Partial<CustomerAddress>): Promise<CustomerAddress> {
    const addr = await this.addressRepo.findOne({ where: { id: addressId, customerId } })
    if (!addr) throw new NotFoundException('Address not found')
    Object.assign(addr, dto)
    return this.addressRepo.save(addr)
  }

  async deleteAddress(customerId: string, addressId: string): Promise<void> {
    const addr = await this.addressRepo.findOne({ where: { id: addressId, customerId } })
    if (!addr) throw new NotFoundException('Address not found')
    await this.addressRepo.remove(addr)
  }

  // ─── Orders ───────────────────────────────────────────────────────────────

  async getOrders(customerId: string): Promise<Order[]> {
    return this.orderRepo.find({
      where: { customerId, isDeleted: false },
      order: { createdAt: 'DESC' },
    })
  }
}
