import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { Cache } from 'cache-manager'
import { Customer, CustomerType } from '../../database/entities/customer.entity'
import { CustomerAddress } from '../../database/entities/customer-address.entity'
import { Order } from '../../database/entities/order.entity'
import { User } from '../../database/entities/user.entity'
import { CouponsService } from '../coupons/coupons.service'
import { PricingEngineService } from '../pricing/services/pricing-engine.service'
import { EmailService } from '../../infrastructure/email/email.service'

interface CartItem {
  productId: string
  productName: string
  quantity: number
  price: number
  metadata?: Record<string, any>
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
  notes?: string
}

@Injectable()
export class StorefrontService {
  private readonly CART_TTL = 60 * 60 * 24 * 7 // 7 days
  private readonly WISHLIST_TTL = 60 * 60 * 24 * 30 // 30 days

  constructor(
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,

    @InjectRepository(CustomerAddress)
    private readonly addressRepo: Repository<CustomerAddress>,

    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,

    private readonly couponsService: CouponsService,

    private readonly pricingEngine: PricingEngineService,

    private readonly emailService: EmailService,
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
    return this.readCart(customerId)
  }

  async addToCart(customerId: string, item: CartItem): Promise<Cart> {
    const cart = await this.readCart(customerId)
    const existing = cart.items.find((i) => i.productId === item.productId)
    if (existing) {
      existing.quantity += item.quantity
    } else {
      cart.items.push(item)
    }
    await this.saveCart(customerId, cart)
    return cart
  }

  async updateCartItem(customerId: string, productId: string, quantity: number): Promise<Cart> {
    const cart = await this.readCart(customerId)
    if (quantity <= 0) {
      cart.items = cart.items.filter((i) => i.productId !== productId)
    } else {
      const item = cart.items.find((i) => i.productId === productId)
      if (item) item.quantity = quantity
    }
    await this.saveCart(customerId, cart)
    return cart
  }

  async removeFromCart(customerId: string, productId: string): Promise<Cart> {
    const cart = await this.readCart(customerId)
    cart.items = cart.items.filter((i) => i.productId !== productId)
    await this.saveCart(customerId, cart)
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
  private couponDiscount(cart: Cart, subtotal: number): number {
    if (!cart.coupon) return 0
    if (cart.coupon.discountType === 'fixed') {
      return Math.min(cart.coupon.discount, subtotal)
    }
    return Math.round(subtotal * (cart.coupon.discount / 100) * 100) / 100
  }

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

  async checkout(tenantId: string, customerId: string, dto: CheckoutDto): Promise<Order> {
    const cart = await this.readCart(customerId)
    if (!cart.items.length) {
      throw new BadRequestException('Cart is empty')
    }

    let customer = await this.customerRepo.findOne({
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

    // Re-price every line item from the Pricing Engine server-side so the order
    // total is authoritative and tamper-proof (never trust the client price).
    // Configured items must be priced WITH their chosen attributes (karat,
    // color, carat) — pricing the product's defaults would charge the wrong amount.
    for (const item of cart.items) {
      try {
        const meta = item.metadata || {}
        const overrides: Record<string, any> = {}
        if (meta.metalType) overrides.metalPurity = String(meta.metalType).replace('KT', 'K')
        if (meta.metalColor) overrides.metalColor = meta.metalColor
        const ct = Number(String(meta.centerDiamondWeight ?? '').replace(/[^0-9.]/g, ''))
        if (ct > 0) overrides.diamondWeightCt = ct
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
    const discountAmount = Number(this.couponDiscount(cart, subtotal)) || 0
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

    const order = this.orderRepo.create({
      tenantId,
      orderNumber,
      customerId,
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
      diamondQuality: '',
      diamondWeightCt: firstCt,
      productSize: firstMeta.ringSize || firstMeta.size || '',
      quantity: firstItem.quantity,
      totalAmount,
      orderStatus: 'Pending',
      paymentStatus: 'Pending',
      orderNotes: dto.notes || '',
      channel: 'storefront',
      orderDate: new Date().toISOString().slice(0, 10),
    })

    const saved = await this.orderRepo.save(order)
    await this.clearCart(customerId)

    // Fire-and-forget order confirmation email (no-op / console-log in dev
    // until SMTP env vars are set; never blocks or fails checkout).
    this.emailService
      .sendOrderConfirmation(customer.email || '', saved.orderNumber, customer.customerName, {
        total: totalAmount,
        paymentMethod: dto.paymentMethod || 'COD',
        productName: firstItem.productName,
        shippingAddress: addressText,
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
