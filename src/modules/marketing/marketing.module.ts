import { Global, Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Order } from '../../database/entities/order.entity'
import { Product } from '../../database/entities/product.entity'
import { MarketingService } from './marketing.service'
import { MarketingController } from './marketing.controller'

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Order, Product])],
  controllers: [MarketingController],
  providers: [MarketingService],
  exports: [MarketingService],
})
export class MarketingModule {}
