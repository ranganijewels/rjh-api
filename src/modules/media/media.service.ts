import {
  Injectable,
  BadRequestException,
  Logger,
  PayloadTooLargeException,
} from '@nestjs/common'
import { v4 as uuid } from 'uuid'
import * as path from 'path'
import * as sharp from 'sharp'
import { MinioService } from '../../infrastructure/minio/minio.service'

const ALLOWED_MIMETYPES = [
  // Images
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  // Documents
  'application/pdf',
  // Videos
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/x-msvideo',
  // CAD / design / 3D model files
  'application/octet-stream',       // .3dm, .stl, .obj, .glb, generic binary
  'model/stl',
  'model/obj',
  'model/gltf-binary',              // .glb
  'model/gltf+json',                // .gltf
  'application/zip',
  'application/x-zip-compressed',
  'application/x-rar-compressed',
  'application/vnd.rar',
  'application/postscript',          // .ai
  'image/vnd.adobe.photoshop',       // .psd
  'image/x-photoshop',
]

const MAX_FILE_SIZE_BYTES = 200 * 1024 * 1024 // 200 MB (raw phone-shot product videos routinely exceed the old 50 MB cap)
const IMAGE_MAX_WIDTH = 1920
const IMAGE_QUALITY = 85

export interface UploadResult {
  url: string
  key: string
  bucket: string
}

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name)

  constructor(private readonly minioService: MinioService) {}

  async uploadFile(
    file: Express.Multer.File,
    bucket: string,
    prefix?: string,
  ): Promise<UploadResult> {
    // Validate mimetype
    if (!ALLOWED_MIMETYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `File type "${file.mimetype}" is not allowed. Allowed types: ${ALLOWED_MIMETYPES.join(', ')}`,
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new PayloadTooLargeException(
        `File size exceeds the 50 MB limit (received ${(file.size / 1024 / 1024).toFixed(2)} MB)`,
      )
    }

    const ext = path.extname(file.originalname).replace('.', '') || this.extFromMime(file.mimetype)
    const key = `${prefix || 'uploads'}/${Date.now()}-${uuid()}.${ext}`

    let buffer = file.buffer

    // Compress images using sharp (skip PDFs and GIFs)
    if (file.mimetype.startsWith('image/') && file.mimetype !== 'image/gif') {
      try {
        buffer = await sharp(file.buffer)
          .resize({ width: IMAGE_MAX_WIDTH, withoutEnlargement: true })
          .toFormat(this.sharpFormat(file.mimetype), { quality: IMAGE_QUALITY })
          .toBuffer()
      } catch (err) {
        this.logger.warn(`sharp compression failed, uploading original: ${err}`)
        buffer = file.buffer
      }
    }

    // Ensure bucket exists
    await this.minioService.ensureBucket(bucket)

    const url = await this.minioService.upload(bucket, key, buffer, file.mimetype)

    this.logger.log(`Uploaded file to ${bucket}/${key}`)
    return { url, key, bucket }
  }

  async deleteFile(bucket: string, key: string): Promise<void> {
    await this.minioService.delete(bucket, key)
    this.logger.log(`Deleted file ${bucket}/${key}`)
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private extFromMime(mime: string): string {
    const map: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif',
      'application/pdf': 'pdf',
      'video/mp4': 'mp4',
      'video/quicktime': 'mov',
      'video/webm': 'webm',
      'video/x-msvideo': 'avi',
      'application/zip': 'zip',
      'application/x-zip-compressed': 'zip',
      'application/x-rar-compressed': 'rar',
      'application/vnd.rar': 'rar',
      'application/postscript': 'ai',
      'image/vnd.adobe.photoshop': 'psd',
      'image/x-photoshop': 'psd',
    }
    return map[mime] || 'bin'
  }

  private sharpFormat(mime: string): keyof sharp.FormatEnum {
    const map: Record<string, keyof sharp.FormatEnum> = {
      'image/jpeg': 'jpeg',
      'image/png': 'png',
      'image/webp': 'webp',
    }
    return map[mime] || 'jpeg'
  }
}
