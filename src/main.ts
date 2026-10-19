import { NestFactory } from '@nestjs/core'
import { NestExpressApplication } from '@nestjs/platform-express'
import { ValidationPipe, VersioningType } from '@nestjs/common'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import { ConfigService } from '@nestjs/config'
import helmet from 'helmet'
import * as compression from 'compression'
import { join } from 'path'
import { AppModule } from './app.module'
import { GlobalExceptionFilter } from './common/filters/global-exception.filter'
import { ResponseTransformInterceptor } from './common/interceptors/response-transform.interceptor'

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
    // Exposes req.rawBody (exact bytes) alongside the normal parsed body —
    // needed to verify the Cashfree webhook's HMAC signature, which is
    // computed over the raw request bytes, not the re-serialized JSON.
    rawBody: true,
  })

  // Express's default JSON body limit is 100kb — comfortably enough for one
  // record, but a bulk import (pricing-master CSV import, catalog bulk ops)
  // or a base64-encoded image posted as JSON can exceed that easily, which
  // surfaced as a bare "request entity too large" 500 with no useful detail.
  // useBodyParser (not a manual express.json() app.use()) keeps this
  // rawBody-aware, so the Cashfree webhook signature check above still works.
  app.useBodyParser('json', { limit: '10mb' })
  app.useBodyParser('urlencoded', { limit: '10mb', extended: true })

  const configService = app.get(ConfigService)
  const port = configService.get<number>('PORT', 4000)
  const corsOrigins = configService.get<string>('CORS_ORIGINS', 'http://localhost:3000,http://localhost:3001').split(',')

  app.use(compression())

  // CORS must be registered BEFORE static asset middleware so that
  // video/audio range requests from the storefront (port 3000) get
  // Access-Control-Allow-Origin headers from the uploads directory.
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || corsOrigins.includes(origin) || origin.startsWith('http://localhost')) {
        callback(null, true)
      } else {
        callback(null, false)
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id', 'x-refresh-token'],
    exposedHeaders: ['Content-Range', 'Accept-Ranges', 'Content-Length'],
  })

  app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: false }))

  // Serve static files (public/ + uploads/) after CORS so range requests work cross-origin
  const publicPath = join(process.cwd(), 'public')
  app.useStaticAssets(publicPath, { prefix: '/' })

  app.setGlobalPrefix('api')
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' })

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  )

  app.useGlobalFilters(new GlobalExceptionFilter())
  app.useGlobalInterceptors(new ResponseTransformInterceptor())

  const swaggerConfig = new DocumentBuilder()
    .setTitle('RJ House API')
    .setDescription('RJ House Enterprise API — ERP + E-Commerce')
    .setVersion('1.0')
    .addBearerAuth()
    .addApiKey({ type: 'apiKey', name: 'x-tenant-id', in: 'header' }, 'tenant-id')
    .build()

  const document = SwaggerModule.createDocument(app, swaggerConfig)
  SwaggerModule.setup('api/docs', app, document)

  // Graceful shutdown: on pm2 reload the old worker finishes in-flight requests
  // before exiting, so deploys drop nothing.
  app.enableShutdownHooks()
  if (process.env.HOST) await app.listen(port, process.env.HOST)
  else await app.listen(port)
  console.log(`🚀 RJ House API running on http://localhost:${port}/api/v1`)
  console.log(`📚 Swagger docs at http://localhost:${port}/api/docs`)
}

bootstrap()
