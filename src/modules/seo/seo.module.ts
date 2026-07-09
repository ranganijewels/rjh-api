import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { SeoPage } from '../../database/entities/seo-page.entity'
import { SeoRedirect } from '../../database/entities/seo-redirect.entity'
import { Product } from '../../database/entities/product.entity'
import { CatalogMaster } from '../../database/entities/catalog-master.entity'
import { SeoService } from './seo.service'
import { SeoController } from './seo.controller'
import { PricingModule } from '../pricing/pricing.module'

@Module({
  imports: [TypeOrmModule.forFeature([SeoPage, SeoRedirect, Product, CatalogMaster]), PricingModule],
  providers: [SeoService],
  controllers: [SeoController],
  exports: [SeoService],
})
export class SeoModule {}
