import { Product } from '../../database/entities/product.entity'
import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Customer } from '../../database/entities/customer.entity'
import { CustomerAddress } from '../../database/entities/customer-address.entity'
import { Order } from '../../database/entities/order.entity'
import { User } from '../../database/entities/user.entity'
import { StorefrontService } from './storefront.service'
import { StorefrontController } from './storefront.controller'
import { CouponsModule } from '../coupons/coupons.module'
import { PricingModule } from '../pricing/pricing.module'
import { PaymentsModule } from '../payments/payments.module'
import { CurrencyModule } from '../currency/currency.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([Customer, CustomerAddress, Order, User, Product]),
    CouponsModule,
    PricingModule,
    PaymentsModule,
    CurrencyModule,
  ],
  providers: [StorefrontService],
  controllers: [StorefrontController],
  exports: [StorefrontService],
})
export class StorefrontModule {}
