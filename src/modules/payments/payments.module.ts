import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Order } from '../../database/entities/order.entity'
import { CashfreeService } from './services/cashfree.service'
import { PaymentsController } from './payments.controller'

@Module({
  imports: [TypeOrmModule.forFeature([Order])],
  providers: [CashfreeService],
  controllers: [PaymentsController],
  exports: [CashfreeService],
})
export class PaymentsModule {}
