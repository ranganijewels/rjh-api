import { Module } from '@nestjs/common'
import { MulterModule } from '@nestjs/platform-express'
import { memoryStorage } from 'multer'
import { MediaService } from './media.service'
import { MediaController } from './media.controller'

// Must match MediaService.MAX_FILE_SIZE_BYTES — Multer enforces this limit at
// the HTTP layer before MediaService.uploadFile ever runs, so if the two
// drift, uploads between the two ceilings are silently rejected here without
// MediaService's own check ever having a chance to run.
const MAX_FILE_SIZE_BYTES = 200 * 1024 * 1024 // 200 MB

@Module({
  imports: [
    MulterModule.register({
      storage: memoryStorage(),
      limits: {
        fileSize: MAX_FILE_SIZE_BYTES,
      },
    }),
  ],
  providers: [MediaService],
  controllers: [MediaController],
  exports: [MediaService],
})
export class MediaModule {}
