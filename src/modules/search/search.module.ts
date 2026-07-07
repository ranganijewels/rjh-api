import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Product } from '../../database/entities/product.entity'
import { CatalogMaster } from '../../database/entities/catalog-master.entity'
import { SearchService } from './search.service'
import { SearchController } from './search.controller'

@Module({
  imports: [TypeOrmModule.forFeature([Product, CatalogMaster])],
  providers: [SearchService],
  controllers: [SearchController],
  exports: [SearchService],
})
export class SearchModule {}
