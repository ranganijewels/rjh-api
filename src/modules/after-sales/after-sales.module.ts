import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { WarrantyRegistration } from '../../database/entities/warranty-registration.entity'
import { ServiceRequest } from '../../database/entities/service-request.entity'
import { ReturnRma } from '../../database/entities/return-rma.entity'
import { AfterSalesService } from './after-sales.service'
import { AfterSalesController } from './after-sales.controller'

@Module({
  imports: [
    TypeOrmModule.forFeature([WarrantyRegistration, ServiceRequest, ReturnRma]),
  ],
  providers: [AfterSalesService],
  controllers: [AfterSalesController],
  exports: [AfterSalesService],
})
export class AfterSalesModule {}
