import { Module, OnModuleInit } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { CatalogMaster } from '../../database/entities/catalog-master.entity'
import { ProductFamily } from '../../database/entities/product-family.entity'
import { ProductBom } from '../../database/entities/product-bom.entity'
import { Product } from '../../database/entities/product.entity'
import { CatalogMasterService } from './services/catalog-master.service'
import { ProductFamilyService } from './services/product-family.service'
import { ProductBomService } from './services/product-bom.service'
import { ConfiguratorService } from './services/configurator.service'
import { CatalogController } from './controllers/catalog.controller'
import { CatalogSeeder } from './catalog.seed'
import { PricingModule } from '../pricing/pricing.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([CatalogMaster, ProductFamily, ProductBom, Product]),
    PricingModule, // for PricingEngineService (configurator)
  ],
  providers: [
    CatalogMasterService,
    ProductFamilyService,
    ProductBomService,
    ConfiguratorService,
    CatalogSeeder,
  ],
  controllers: [CatalogController],
  exports: [CatalogMasterService, ProductFamilyService, ProductBomService, ConfiguratorService],
})
export class CatalogModule implements OnModuleInit {
  constructor(private readonly seeder: CatalogSeeder) {}
  async onModuleInit() {
    await this.seeder.seedDefaults()
  }
}
