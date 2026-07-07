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
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { Public } from '../../common/decorators/public.decorator'

@ApiTags('storefront')
@ApiBearerAuth()
@Controller('storefront')
@UseGuards(JwtAuthGuard)
export class StorefrontController {
  constructor(private readonly storefrontService: StorefrontService) {}

  // ─── Cart ─────────────────────────────────────────────────────────────────

  @Get('cart')
  @ApiOperation({ summary: 'Get current customer cart' })
  getCart(@CurrentUser('id') customerId: string) {
    return this.storefrontService.getCart(customerId)
  }

  @Post('cart')
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

  @Patch('cart/:productId')
  @ApiOperation({ summary: 'Update cart item quantity' })
  updateCartItem(
    @CurrentUser('id') customerId: string,
    @Param('productId') productId: string,
    @Body() body: { quantity: number },
  ) {
    return this.storefrontService.updateCartItem(customerId, productId, body.quantity)
  }

  @Delete('cart/:productId')
  @ApiOperation({ summary: 'Remove item from cart' })
  removeFromCart(
    @CurrentUser('id') customerId: string,
    @Param('productId') productId: string,
  ) {
    return this.storefrontService.removeFromCart(customerId, productId)
  }

  @Post('cart/coupon')
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
  @ApiOperation({ summary: 'Remove the applied coupon from the cart' })
  removeCartCoupon(@CurrentUser('id') customerId: string) {
    return this.storefrontService.removeCartCoupon(customerId)
  }

  @Post('cart/checkout')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Checkout and create order from cart' })
  checkout(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') customerId: string,
    @Body() dto: CheckoutDto,
  ) {
    return this.storefrontService.checkout(tenantId, customerId, dto)
  }

  // ─── Wishlist ─────────────────────────────────────────────────────────────

  @Get('wishlist')
  @ApiOperation({ summary: 'Get customer wishlist' })
  getWishlist(@CurrentUser('id') customerId: string) {
    return this.storefrontService.getWishlist(customerId)
  }

  @Post('wishlist')
  @ApiOperation({ summary: 'Toggle product on wishlist (add/remove)' })
  toggleWishlist(
    @CurrentUser('id') customerId: string,
    @Body() body: { productId: string; productData?: Record<string, any> },
  ) {
    return this.storefrontService.toggleWishlist(customerId, body.productId, body.productData || {})
  }

  // ─── Addresses ────────────────────────────────────────────────────────────

  @Get('addresses')
  @ApiOperation({ summary: 'Get saved addresses for current customer' })
  getAddresses(@CurrentUser('id') customerId: string) {
    return this.storefrontService.getAddresses(customerId)
  }

  @Post('addresses')
  @ApiOperation({ summary: 'Add a new address' })
  addAddress(
    @CurrentUser('id') customerId: string,
    @CurrentUser('tenantId') tenantId: string,
    @Body() body: Record<string, any>,
  ) {
    return this.storefrontService.addAddress(customerId, tenantId, body)
  }

  @Patch('addresses/:id')
  @ApiOperation({ summary: 'Update an address' })
  updateAddress(
    @CurrentUser('id') customerId: string,
    @Param('id') addressId: string,
    @Body() body: Record<string, any>,
  ) {
    return this.storefrontService.updateAddress(customerId, addressId, body)
  }

  @Delete('addresses/:id')
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
