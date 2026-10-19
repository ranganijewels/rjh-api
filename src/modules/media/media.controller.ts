import {
  Controller,
  Post,
  Delete,
  Query,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Version,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger'
import { MediaService } from './media.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'

@ApiTags('Media')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload a file to object storage (MinIO)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiQuery({ name: 'bucket', required: true, description: 'Target MinIO bucket' })
  @ApiQuery({ name: 'prefix', required: false, description: 'Key prefix / folder path' })
  @UseInterceptors(FileInterceptor('file'))
  uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Query('bucket') bucket: string,
    @Query('prefix') prefix?: string,
  ) {
    if (!file) throw new BadRequestException('No file provided')
    if (!bucket) throw new BadRequestException('Query param "bucket" is required')
    return this.mediaService.uploadFile(file, bucket, prefix)
  }

  @Delete(':bucket/:key(*)')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a file from object storage' })
  deleteFile(
    @Param('bucket') bucket: string,
    @Param('key') key: string,
  ) {
    return this.mediaService.deleteFile(bucket, key)
  }
}
