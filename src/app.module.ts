import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler'
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core'
import { ScheduleModule } from '@nestjs/schedule'
import { EventEmitterModule } from '@nestjs/event-emitter'
import configuration from './config/configuration'
import { join } from 'path'

// Infrastructure
import { RedisModule } from './infrastructure/redis/redis.module'
import { MinioModule } from './infrastructure/minio/minio.module'
import { ElasticsearchModule } from './infrastructure/elasticsearch/elasticsearch.module'
import { EmailModule } from './infrastructure/email/email.module'

// Business modules
import { AuthModule } from './modules/auth/auth.module'
import { UsersModule } from './modules/users/users.module'
import { TenantsModule } from './modules/tenants/tenants.module'
import { ProductsModule } from './modules/products/products.module'
import { DesignsModule } from './modules/designs/designs.module'
import { MediaModule } from './modules/media/media.module'
import { InventoryModule } from './modules/inventory/inventory.module'
import { ProcurementModule } from './modules/procurement/procurement.module'
import { DiamondsModule } from './modules/diamonds/diamonds.module'
import { OrdersModule } from './modules/orders/orders.module'
import { CustomersModule } from './modules/customers/customers.module'
import { StorefrontModule } from './modules/storefront/storefront.module'
import { SalesModule } from './modules/sales/sales.module'
import { AiSalesModule } from './modules/ai-sales/ai-sales.module'
import { ChannelsModule } from './modules/channels/channels.module'
import { MastersModule } from './modules/masters/masters.module'
import { CmsModule } from './modules/cms/cms.module'
import { ReportsModule } from './modules/reports/reports.module'
import { AnalyticsModule } from './modules/analytics/analytics.module'
import { CatalogModule } from './modules/catalog/catalog.module'
import { EventsModule } from './modules/events/events.module'
import { SearchModule } from './modules/search/search.module'
import { AccountsModule } from './modules/accounts/accounts.module'
import { QuotesModule } from './modules/quotes/quotes.module'
import { PimModule } from './modules/pim/pim.module'
import { DamModule } from './modules/dam/dam.module'
import { SeoModule } from './modules/seo/seo.module'
import { MesModule } from './modules/mes/mes.module'
import { FeedsModule } from './modules/feeds/feeds.module'
import { AfterSalesModule } from './modules/after-sales/after-sales.module'
import { ReviewsModule } from './modules/reviews/reviews.module'
import { NotificationsModule } from './modules/notifications/notifications.module'
import { AuditModule } from './modules/audit/audit.module'
import { CouponsModule } from './modules/coupons/coupons.module'
import { SubmissionsModule } from './modules/submissions/submissions.module'
import { PricingConfigModule } from './modules/pricing-config/pricing-config.module'
import { CurrencyModule } from './modules/currency/currency.module'
import { PricingModule } from './modules/pricing/pricing.module'
import { ChatModule } from './modules/chat/chat.module'
import { InstagramModule } from './modules/instagram/instagram.module'
import { HealthController } from './health/health.controller'

// Guards & Interceptors
import { JwtAuthGuard } from './common/guards/jwt-auth.guard'
import { RolesGuard } from './common/guards/roles.guard'
import { AuditLogInterceptor } from './common/interceptors/audit-log.interceptor'
import { AuditService } from './modules/audit/audit.service'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('database.host'),
        port: config.get('database.port'),
        username: config.get('database.username'),
        password: config.get('database.password'),
        database: config.get('database.name'),
        ssl: config.get('database.ssl'),
        entities: [join(__dirname, 'database/entities/**/*.entity{.ts,.js}')],
        synchronize: config.get('nodeEnv') === 'development',
        logging: config.get('nodeEnv') === 'development',
        autoLoadEntities: true,
      }),
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [{ ttl: config.get('throttle.ttl', 60) * 1000, limit: config.get('throttle.limitPublic', 100) }],
      }),
    }),
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    RedisModule,
    MinioModule,
    ElasticsearchModule,
    EmailModule,
    AuthModule,
    UsersModule,
    TenantsModule,
    ProductsModule,
    DesignsModule,
    MediaModule,
    InventoryModule,
    ProcurementModule,
    DiamondsModule,
    OrdersModule,
    CustomersModule,
    StorefrontModule,
    SalesModule,
    AiSalesModule,
    ChannelsModule,
    MastersModule,
    CmsModule,
    ReportsModule,
    AnalyticsModule,
    NotificationsModule,
    AuditModule,
    CouponsModule,
    SubmissionsModule,
    PricingConfigModule,
    CurrencyModule,
    PricingModule,
    CatalogModule,
    EventsModule,
    SearchModule,
    AccountsModule,
    QuotesModule,
    PimModule,
    DamModule,
    SeoModule,
    MesModule,
    FeedsModule,
    AfterSalesModule,
    ReviewsModule,
    ChatModule,
    InstagramModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    {
      provide: APP_INTERCEPTOR,
      useFactory: (auditService: AuditService) => {
        const interceptor = new AuditLogInterceptor(auditService)
        return interceptor
      },
      inject: [AuditService],
    },
  ],
})
export class AppModule {}
