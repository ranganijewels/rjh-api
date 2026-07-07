import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Order } from '../../database/entities/order.entity'
import { Product } from '../../database/entities/product.entity'
import { InventoryItem } from '../../database/entities/inventory-item.entity'
import { PurchaseOrder } from '../../database/entities/purchase-order.entity'
import { Customer } from '../../database/entities/customer.entity'
import { ReportsService } from './reports.service'
import { ReportsController } from './reports.controller'

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, Product, InventoryItem, PurchaseOrder, Customer]),
  ],
  providers: [ReportsService],
  controllers: [ReportsController],
  exports: [ReportsService],
})
export class ReportsModule {}
