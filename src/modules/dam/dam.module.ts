import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { DamAsset } from '../../database/entities/dam-asset.entity'
import { ProductAssetBinding } from '../../database/entities/product-asset-binding.entity'
import { Product } from '../../database/entities/product.entity'
import { CatalogMaster } from '../../database/entities/catalog-master.entity'
import { DamService } from './dam.service'
import { DamController } from './dam.controller'

@Module({
  imports: [TypeOrmModule.forFeature([DamAsset, ProductAssetBinding, Product, CatalogMaster])],
  controllers: [DamController],
  providers: [DamService],
  exports: [DamService],
})
export class DamModule {}
