import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AttributeDefinition } from '../../database/entities/attribute-definition.entity'
import { AttributeValue } from '../../database/entities/attribute-value.entity'
import { Product } from '../../database/entities/product.entity'
import { PimService } from './pim.service'
import { PimController } from './pim.controller'

@Module({
  imports: [TypeOrmModule.forFeature([AttributeDefinition, AttributeValue, Product])],
  providers: [PimService],
  controllers: [PimController],
  exports: [PimService],
})
export class PimModule {}
