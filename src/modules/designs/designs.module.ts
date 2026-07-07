import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Design } from '../../database/entities/design.entity'
import { DesignMedia } from '../../database/entities/design-media.entity'
import { DesignsService } from './designs.service'
import { DesignsController } from './designs.controller'
import { ElasticsearchModule } from '../../infrastructure/elasticsearch/elasticsearch.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([Design, DesignMedia]),
    ElasticsearchModule,
  ],
  providers: [DesignsService],
  controllers: [DesignsController],
  exports: [DesignsService],
})
export class DesignsModule {}
