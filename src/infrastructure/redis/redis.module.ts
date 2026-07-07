import { Module, Global } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { CacheModule } from '@nestjs/cache-manager'
import { redisStore } from 'cache-manager-redis-yet'

@Global()
@Module({
  imports: [
    CacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => ({
        store: await redisStore({
          socket: {
            host: config.get<string>('redis.host'),
            port: config.get<number>('redis.port'),
          },
          password: config.get<string>('redis.password'),
        }),
        ttl: 300,
      }),
    }),
  ],
  exports: [CacheModule],
})
export class RedisModule {}
