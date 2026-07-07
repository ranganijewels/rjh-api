export default () => ({
  port: parseInt(process.env.PORT, 10) || 4000,
  nodeEnv: process.env.NODE_ENV || 'development',
  appName: process.env.APP_NAME || 'RJ House API',

  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    username: process.env.DB_USERNAME || 'rjhouse',
    password: process.env.DB_PASSWORD || 'rjhouse_secret',
    name: process.env.DB_NAME || 'rjhouse_db',
    ssl: process.env.DB_SSL === 'true',
  },

  jwt: {
    privateKey: process.env.JWT_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    publicKey: process.env.JWT_PUBLIC_KEY?.replace(/\\n/g, '\n'),
    accessExpires: process.env.JWT_ACCESS_EXPIRES || '15m',
    refreshExpires: process.env.JWT_REFRESH_EXPIRES || '7d',
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
  },

  minio: {
    endpoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_PORT, 10) || 9000,
    useSsl: process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
    publicUrl: process.env.MINIO_PUBLIC_URL || 'http://localhost:9000',
    buckets: {
      productMedia: 'product-media',
      designMedia: 'design-media',
      jobCardMedia: 'job-card-media',
      erpMedia: 'erp-media',
      supplierDocs: 'supplier-docs',
    },
  },

  elasticsearch: {
    node: process.env.ELASTICSEARCH_NODE || 'http://localhost:9200',
    username: process.env.ELASTICSEARCH_USERNAME,
    password: process.env.ELASTICSEARCH_PASSWORD,
  },

  rabbitmq: {
    url: process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672',
    queues: {
      email: process.env.RABBITMQ_QUEUE_EMAIL || 'rjhouse_email',
      notification: process.env.RABBITMQ_QUEUE_NOTIFICATION || 'rjhouse_notification',
      audit: process.env.RABBITMQ_QUEUE_AUDIT || 'rjhouse_audit',
      jobs: process.env.RABBITMQ_QUEUE_JOBS || 'rjhouse_jobs',
    },
  },

  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.EMAIL_FROM || 'RJ House <noreply@rjhouse.com>',
  },

  throttle: {
    ttl: parseInt(process.env.THROTTLE_TTL, 10) || 60,
    limitPublic: parseInt(process.env.THROTTLE_LIMIT_PUBLIC, 10) || 100,
    limitAuth: parseInt(process.env.THROTTLE_LIMIT_AUTH, 10) || 500,
  },

  defaultTenantId: process.env.DEFAULT_TENANT_ID || '00000000-0000-0000-0000-000000000001',

  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-4o',
  },
})
