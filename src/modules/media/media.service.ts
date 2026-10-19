import {
  Injectable,
  BadRequestException,
  Logger,
  PayloadTooLargeException,
} from '@nestjs/common'
import { v4 as uuid } from 'uuid'
import * as path from 'path'
import * as sharp from 'sharp'
import { execFile } from 'child_process'
import { promises as fsp } from 'fs'
import * as os from 'os'
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
    if (file.mimetype.startsWith('video/')) {
      // Background, best effort: a "-poster.jpg" still beside the video (the
      // storefront hero shows it first) and a lighter re-encode of big files.
      this.optimizeVideo(bucket, key, buffer, file.mimetype).catch((err) =>
        this.logger.warn(`video optimisation skipped for ${key}: ${err?.message || err}`),
      )
    }
    return { url, key, bucket }
  }

  private run(cmd: string, args: string[]) {
    return new Promise<void>((resolve, reject) =>
      execFile(cmd, args, { timeout: 10 * 60 * 1000 }, (err) => (err ? reject(err) : resolve())),
    )
  }

  private async optimizeVideo(bucket: string, key: string, buffer: Buffer, mimetype: string) {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'rj-video-'))
    const ext = path.extname(key) || '.mp4'
    const src = path.join(dir, `src${ext}`)
    try {
      await fsp.writeFile(src, buffer)
      const poster = path.join(dir, 'poster.jpg')
      await this.run('ffmpeg', ['-nostdin', '-v', 'error', '-y', '-ss', '0.5', '-i', src, '-vframes', '1', '-vf', 'scale=w=min(1280\\,iw):h=-2', '-q:v', '5', poster])
      const posterKey = key.replace(/\.[^.]+$/, '-poster.jpg')
      await this.minioService.upload(bucket, posterKey, await fsp.readFile(poster), 'image/jpeg')

      if (buffer.length > 3 * 1024 * 1024 && /mp4/.test(mimetype)) {
        const out = path.join(dir, 'out.mp4')
        await this.run('ffmpeg', ['-nostdin', '-v', 'error', '-y', '-i', src, '-c:v', 'libx264', '-preset', 'medium', '-crf', '28', '-pix_fmt', 'yuv420p', '-vf', 'scale=w=min(1280\\,iw):h=-2', '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', '-f', 'mp4', out])
        const smaller = await fsp.readFile(out)
        if (smaller.length < buffer.length) await this.minioService.upload(bucket, key, smaller, mimetype)
      }
    } finally {
      await fsp.rm(dir, { recursive: true, force: true })
    }
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
