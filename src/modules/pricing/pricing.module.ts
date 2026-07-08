import { Module, OnModuleInit } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Product } from '../../database/entities/product.entity'
import { MetalRate } from '../../database/entities/metal-rate.entity'
import { DiamondRate } from '../../database/entities/diamond-rate.entity'
import { LaborRate } from '../../database/entities/labor-rate.entity'
import { TaxRate } from '../../database/entities/tax-rate.entity'
import { ShippingRate } from '../../database/entities/shipping-rate.entity'
import { AdditionalCharge } from '../../database/entities/additional-charge.entity'
import { DiamondMetalWeight } from '../../database/entities/diamond-metal-weight.entity'
import { PriceBook } from '../../database/entities/price-book.entity'
import { CatalogMaster } from '../../database/entities/catalog-master.entity'

import { MetalRateService } from './services/metal-rate.service'
import { DiamondRateService } from './services/diamond-rate.service'
import { LaborRateService } from './services/labor-rate.service'
import { TaxRateService } from './services/tax-rate.service'
import { ShippingRateService } from './services/shipping-rate.service'
import { AdditionalChargeService } from './services/additional-charge.service'
import { DiamondMetalWeightService } from './services/diamond-metal-weight.service'
import { PriceBookService } from './services/price-book.service'
import { PricingEngineService } from './services/pricing-engine.service'

import {
  MetalRateController, DiamondRateController, LaborRateController,
  TaxRateController, ShippingRateController, AdditionalChargeController,
  DiamondMetalWeightController,
} from './controllers/rate-masters.controller'
import { PriceBookController } from './controllers/price-book.controller'
import { PricingController } from './controllers/pricing.controller'
import { PricingSeeder } from './pricing.seed'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Product, MetalRate, DiamondRate, LaborRate, TaxRate, ShippingRate, AdditionalCharge,
      DiamondMetalWeight, PriceBook, CatalogMaster,
    ]),
  ],
  providers: [
    MetalRateService, DiamondRateService, LaborRateService, TaxRateService,
    ShippingRateService, AdditionalChargeService, DiamondMetalWeightService,
    PriceBookService, PricingEngineService, PricingSeeder,
  ],
  controllers: [
    MetalRateController, DiamondRateController, LaborRateController,
    TaxRateController, ShippingRateController, AdditionalChargeController,
    DiamondMetalWeightController, PriceBookController, PricingController,
  ],
  exports: [PricingEngineService, PriceBookService],
})
export class PricingModule implements OnModuleInit {
  constructor(private readonly seeder: PricingSeeder) {}
  async onModuleInit() {
    await this.seeder.seedDefaults()
  }
}
