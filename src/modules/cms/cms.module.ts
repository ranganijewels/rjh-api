import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { CmsPage } from '../../database/entities/cms-page.entity'
import { CmsBlog } from '../../database/entities/cms-blog.entity'
import { CmsFaq } from '../../database/entities/cms-faq.entity'
import { CmsNavigation } from '../../database/entities/cms-navigation.entity'
import { CmsSection } from '../../database/entities/cms-section.entity'
import { Tenant } from '../../database/entities/tenant.entity'
import { CmsService } from './cms.service'
import { CmsController } from './cms.controller'

@Module({
  imports: [
    TypeOrmModule.forFeature([CmsPage, CmsBlog, CmsFaq, CmsNavigation, CmsSection, Tenant]),
  ],
  providers: [CmsService],
  controllers: [CmsController],
  exports: [CmsService],
})
export class CmsModule {}
