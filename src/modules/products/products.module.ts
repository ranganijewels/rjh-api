import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Product } from '../../database/entities/product.entity'
import { ProductMedia } from '../../database/entities/product-media.entity'
import { ProductsService } from './products.service'
import { ProductsController } from './products.controller'
import { ElasticsearchModule } from '../../infrastructure/elasticsearch/elasticsearch.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, ProductMedia]),
    ElasticsearchModule,
  ],
  providers: [ProductsService],
  controllers: [ProductsController],
  exports: [ProductsService],
})
export class ProductsModule {}
