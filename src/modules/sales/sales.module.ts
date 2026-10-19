import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { SalesLead } from '../../database/entities/sales-lead.entity'
import { SalesFollowUp } from '../../database/entities/sales-follow-up.entity'
import { SalesService } from './sales.service'
import { SalesController } from './sales.controller'

@Module({
  imports: [TypeOrmModule.forFeature([SalesLead, SalesFollowUp])],
  providers: [SalesService],
  controllers: [SalesController],
  exports: [SalesService],
})
export class SalesModule {}
