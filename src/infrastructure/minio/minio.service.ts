import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as fs from 'fs'
import * as path from 'path'

@Injectable()
export class MinioService {
  private readonly logger = new Logger(MinioService.name)
  private readonly uploadsDir: string
  private readonly publicBaseUrl: string

  constructor(private readonly config: ConfigService) {
    this.uploadsDir = path.join(process.cwd(), 'public', 'uploads')
    const port = this.config.get<number>('PORT', 4000)
    // MINIO_PUBLIC_URL predates this local-disk shim (MinIO was replaced with
    // plain filesystem storage) but is kept as the externally-reachable base
    // URL — e.g. https://api.ranganijewelry.com in production. The ":9000"
    // default in .env.example is a leftover MinIO placeholder and must not be
    // used as a real base, so local dev still falls back to this API's port.
    const configuredPublicUrl = this.config.get<string>('minio.publicUrl')
    this.publicBaseUrl =
      configuredPublicUrl && !configuredPublicUrl.includes(':9000')
        ? `${configuredPublicUrl.replace(/\/$/, '')}/uploads`
        : `http://localhost:${port}/uploads`
    this.logger.log(`Local file storage enabled → ${this.uploadsDir} (public base: ${this.publicBaseUrl})`)
  }

  async upload(bucket: string, key: string, buffer: Buffer, _mimetype: string): Promise<string> {
    const bucketDir = path.join(this.uploadsDir, bucket)
    fs.mkdirSync(bucketDir, { recursive: true })
    const filename = path.basename(key)
    const filePath = path.join(bucketDir, filename)
    fs.writeFileSync(filePath, buffer)
    const url = `${this.publicBaseUrl}/${bucket}/${filename}`
    this.logger.log(`Saved file locally: ${url}`)
    return url
  }

  async delete(bucket: string, key: string): Promise<void> {
    const filename = path.basename(key)
    const filePath = path.join(this.uploadsDir, bucket, filename)
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
      this.logger.log(`Deleted local file: ${filePath}`)
    }
  }

  async getSignedUrl(bucket: string, key: string, _expiresIn = 3600): Promise<string> {
    const filename = path.basename(key)
    return `${this.publicBaseUrl}/${bucket}/${filename}`
  }

  async ensureBucket(bucket: string): Promise<void> {
    const bucketDir = path.join(this.uploadsDir, bucket)
    fs.mkdirSync(bucketDir, { recursive: true })
  }
}
