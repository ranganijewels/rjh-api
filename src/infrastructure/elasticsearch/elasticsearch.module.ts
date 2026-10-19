import { Module } from '@nestjs/common'
import { ElasticsearchModule as NestElasticModule } from '@nestjs/elasticsearch'
import { ConfigService } from '@nestjs/config'

@Module({
  imports: [
    NestElasticModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        node: config.get<string>('elasticsearch.node'),
        auth: config.get<string>('elasticsearch.username')
          ? {
              username: config.get<string>('elasticsearch.username'),
              password: config.get<string>('elasticsearch.password'),
            }
          : undefined,
      }),
    }),
  ],
  exports: [NestElasticModule],
})
export class ElasticsearchModule {}
