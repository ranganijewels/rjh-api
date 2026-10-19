import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Headers,
  UseGuards,
  Version,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { Query } from '@nestjs/common'
import { StorefrontService, CheckoutDto } from './storefront.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { CartAccessGuard } from '../../common/guards/cart-access.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { Public } from '../../common/decorators/public.decorator'

@ApiTags('storefront')
@ApiBearerAuth()
@Controller('storefront')
export class StorefrontController {
  constructor(private readonly storefrontService: StorefrontService) {}

  // ─── Cart ───────────────────────────────────────────────────────────────
  // Guest-checkout: CartAccessGuard accepts either a real JWT (logged-in
  // customer) or an `x-guest-id` header (anonymous shopper) so the cart and
  // checkout work before an account exists.

  @Get('cart')
  @Public()
  @UseGuards(CartAccessGuard)
  @ApiOperation({ summary: 'Get current customer cart' })
  getCart(@CurrentUser('id') customerId: string) {
    return this.storefrontService.getCart(customerId)
  }

  @Post('cart')
  @Public()
  @UseGuards(CartAccessGuard)
  @ApiOperation({ summary: 'Add item to cart' })
  addToCart(
    @CurrentUser('id') customerId: string,
    @Body()
    item: {
      productId: string
      productName: string
      quantity: number
      price: number
      metadata?: Record<string, any>
    },
  ) {
    return this.storefrontService.addToCart(customerId, item)
  }

  @Post('cart/coupon')
  @Public()
  @UseGuards(CartAccessGuard)
  @ApiOperation({ summary: 'Apply a coupon code to the cart' })
  applyCartCoupon(
    @CurrentUser('id') customerId: string,
    @CurrentUser('tenantId') tenantId: string,
    @Headers('x-tenant-id') headerTenantId: string,
    @Body() body: { couponCode: string },
  ) {
    return this.storefrontService.applyCartCoupon(
      customerId,
      tenantId || headerTenantId,
      body.couponCode,
    )
  }

  @Delete('cart/coupon')
  @Public()
  @UseGuards(CartAccessGuard)
  @ApiOperation({ summary: 'Remove the applied coupon from the cart' })
  removeCartCoupon(@CurrentUser('id') customerId: string) {
    return this.storefrontService.removeCartCoupon(customerId)
  }

  // Called right after sign-in/sign-up: folds the browser's guest bag into the
  // account cart. Requires a real login (JwtAuthGuard) plus the guest id.
  @Post('cart/merge')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Merge the guest cart (x-guest-id) into the signed-in customer cart' })
  mergeCart(
    @CurrentUser('id') customerId: string,
    @Headers('x-guest-id') guestId: string,
  ) {
    return this.storefrontService.mergeGuestCart(customerId, guestId)
  }

  @Patch('cart/:lineId')
  @Public()
  @UseGuards(CartAccessGuard)
  @ApiOperation({ summary: 'Update a cart line quantity (lineId, or productId for legacy lines)' })
  updateCartItem(
    @CurrentUser('id') customerId: string,
    @Param('lineId') lineId: string,
    @Body() body: { quantity: number },
  ) {
    return this.storefrontService.updateCartItem(customerId, lineId, body.quantity)
  }

  @Delete('cart/:lineId')
  @Public()
  @UseGuards(CartAccessGuard)
  @ApiOperation({ summary: 'Remove a cart line (lineId, or productId for legacy lines)' })
  removeFromCart(
    @CurrentUser('id') customerId: string,
    @Param('lineId') lineId: string,
  ) {
    return this.storefrontService.removeFromCart(customerId, lineId)
  }

  @Post('cart/checkout')
  @Public()
  @UseGuards(CartAccessGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Checkout and create order from cart (guest or logged-in)' })
  checkout(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') customerId: string,
    @CurrentUser('isGuest') isGuest: boolean,
    @Body() dto: CheckoutDto,
  ) {
    return this.storefrontService.checkout(tenantId, customerId, dto, !!isGuest)
  }

  // ─── Wishlist ─────────────────────────────────────────────────────────────

  @Get('wishlist')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get customer wishlist' })
  getWishlist(@CurrentUser('id') customerId: string) {
    return this.storefrontService.getWishlist(customerId)
  }

  @Post('wishlist')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Toggle product on wishlist (add/remove)' })
  toggleWishlist(
    @CurrentUser('id') customerId: string,
    @Body() body: { productId: string; productData?: Record<string, any> },
  ) {
    return this.storefrontService.toggleWishlist(customerId, body.productId, body.productData || {})
  }

  // ─── Addresses ────────────────────────────────────────────────────────────

  @Get('addresses')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get saved addresses for current customer' })
  getAddresses(@CurrentUser('id') customerId: string) {
    return this.storefrontService.getAddresses(customerId)
  }

  @Post('addresses')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Add a new address' })
  addAddress(
    @CurrentUser('id') customerId: string,
    @CurrentUser('tenantId') tenantId: string,
    @Body() body: Record<string, any>,
  ) {
    return this.storefrontService.addAddress(customerId, tenantId, body)
  }

  @Patch('addresses/:id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update an address' })
  updateAddress(
    @CurrentUser('id') customerId: string,
    @Param('id') addressId: string,
    @Body() body: Record<string, any>,
  ) {
    return this.storefrontService.updateAddress(customerId, addressId, body)
  }

  @Delete('addresses/:id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an address' })
  deleteAddress(
    @CurrentUser('id') customerId: string,
    @Param('id') addressId: string,
  ) {
    return this.storefrontService.deleteAddress(customerId, addressId)
  }

  // ─── Orders ───────────────────────────────────────────────────────────────

  @Get('my-orders')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get orders for the current customer' })
  getOrders(@CurrentUser('id') customerId: string) {
    return this.storefrontService.getOrders(customerId)
  }

  // Public guest tracking — no auth; verifies orderNumber + email match.
  @Public()
  @Get('track')
  @ApiOperation({ summary: 'Track an order by number + email (guest, public)' })
  trackOrder(
    @Query('orderNumber') orderNumber: string,
    @Query('email') email: string,
  ) {
    return this.storefrontService.trackOrder(orderNumber, email)
  }
}
