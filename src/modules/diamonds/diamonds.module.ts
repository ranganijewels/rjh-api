import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Diamond } from '../../database/entities/diamond.entity'
import { DiamondParcel } from '../../database/entities/diamond-parcel.entity'
import { DiamondsService } from './diamonds.service'
import { DiamondsController } from './diamonds.controller'

@Module({
  imports: [TypeOrmModule.forFeature([Diamond, DiamondParcel])],
  controllers: [DiamondsController],
  providers: [DiamondsService],
  exports: [DiamondsService],
})
export class DiamondsModule {}
