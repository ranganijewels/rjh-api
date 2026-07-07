import { Module, OnModuleInit } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { WorkCenter } from '../../database/entities/work-center.entity'
import { ProductionOrder } from '../../database/entities/production-order.entity'
import { ProductionJobStep } from '../../database/entities/production-job-step.entity'
import { MesService } from './mes.service'
import { MesController } from './mes.controller'

@Module({
  imports: [
    TypeOrmModule.forFeature([WorkCenter, ProductionOrder, ProductionJobStep]),
  ],
  providers: [MesService],
  controllers: [MesController],
  exports: [MesService],
})
export class MesModule implements OnModuleInit {
  constructor(private readonly svc: MesService) {}

  async onModuleInit() {
    await this.svc.seedDefaults()
  }
}
