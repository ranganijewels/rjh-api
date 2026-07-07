import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Product } from '../../database/entities/product.entity'
import { PricingModule } from '../pricing/pricing.module'
import { FeedService } from './feeds.service'
import { FeedController } from './feeds.controller'

@Module({
  imports: [TypeOrmModule.forFeature([Product]), PricingModule],
  providers: [FeedService],
  controllers: [FeedController],
  exports: [FeedService],
})
export class FeedsModule {}
