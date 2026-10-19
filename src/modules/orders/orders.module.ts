import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Order } from '../../database/entities/order.entity'
import { JobCard } from '../../database/entities/job-card.entity'
import { Customer } from '../../database/entities/customer.entity'
import { Product } from '../../database/entities/product.entity'
import { Design } from '../../database/entities/design.entity'
import { OrdersService } from './orders.service'
import { OrdersController } from './orders.controller'

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, JobCard, Customer, Product, Design]),
  ],
  providers: [OrdersService],
  controllers: [OrdersController],
  exports: [OrdersService],
})
export class OrdersModule {}
