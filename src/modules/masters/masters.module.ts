import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { MasterCategory } from '../../database/entities/master-category.entity'
import { MasterValue } from '../../database/entities/master-value.entity'
import { MastersService } from './masters.service'
import { MastersController } from './masters.controller'

@Module({
  imports: [TypeOrmModule.forFeature([MasterCategory, MasterValue])],
  providers: [MastersService],
  controllers: [MastersController],
  exports: [MastersService],
})
export class MastersModule {}
