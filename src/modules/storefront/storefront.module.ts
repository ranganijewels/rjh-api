import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { CacheModule } from '@nestjs/cache-manager'
import { Customer } from '../../database/entities/customer.entity'
import { CustomerAddress } from '../../database/entities/customer-address.entity'
import { Order } from '../../database/entities/order.entity'
import { User } from '../../database/entities/user.entity'
import { StorefrontService } from './storefront.service'
import { StorefrontController } from './storefront.controller'
import { CouponsModule } from '../coupons/coupons.module'
import { PricingModule } from '../pricing/pricing.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([Customer, CustomerAddress, Order, User]),
    CacheModule.register(),
    CouponsModule,
    PricingModule,
  ],
  providers: [StorefrontService],
  controllers: [StorefrontController],
  exports: [StorefrontService],
})
export class StorefrontModule {}
