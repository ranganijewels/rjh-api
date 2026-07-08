import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Product } from '../../database/entities/product.entity'
import { ProductMedia } from '../../database/entities/product-media.entity'
import { Collection } from '../../database/entities/collection.entity'
import { ProductsService } from './products.service'
import { ProductsController } from './products.controller'
import { CollectionsService } from './collections.service'
import { CollectionsController } from './collections.controller'
import { ElasticsearchModule } from '../../infrastructure/elasticsearch/elasticsearch.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, ProductMedia, Collection]),
    ElasticsearchModule,
  ],
  providers: [ProductsService, CollectionsService],
  controllers: [ProductsController, CollectionsController],
  exports: [ProductsService, CollectionsService],
})
export class ProductsModule {}
