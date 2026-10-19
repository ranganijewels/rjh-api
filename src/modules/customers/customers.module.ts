import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Customer } from '../../database/entities/customer.entity'
import { CustomerAddress } from '../../database/entities/customer-address.entity'
import { CustomersService } from './customers.service'
import { CustomersController } from './customers.controller'

@Module({
  imports: [
    TypeOrmModule.forFeature([Customer, CustomerAddress]),
  ],
  providers: [CustomersService],
  controllers: [CustomersController],
  exports: [CustomersService],
})
export class CustomersModule {}
