import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Order } from '../../database/entities/order.entity'
import { Product } from '../../database/entities/product.entity'
import { Customer } from '../../database/entities/customer.entity'
import { AnalyticsService } from './analytics.service'
import { AnalyticsController } from './analytics.controller'

@Module({
  imports: [TypeOrmModule.forFeature([Order, Product, Customer])],
  providers: [AnalyticsService],
  controllers: [AnalyticsController],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
