import { Controller, Get, Headers } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { Public } from '../../common/decorators/public.decorator'
import { FeedService } from './feeds.service'

const T = '00000000-0000-0000-0000-000000000001'
const tn = (h?: string) => h || T

@ApiTags('feeds')
@Controller('feeds')
export class FeedController {
  constructor(private readonly svc: FeedService) {}

  @Get('items')
  @Public()
  @ApiOperation({ summary: 'Feed items as JSON (admin preview)' })
  async items(@Headers('x-tenant-id') h: string) {
    return this.svc.buildItems(tn(h))
  }

  @Get('google.xml')
  @Public()
  @ApiOperation({ summary: 'Google Merchant RSS 2.0 feed' })
  async googleXml(@Headers('x-tenant-id') h: string) {
    const body = await this.svc.googleXml(tn(h))
    return { format: 'google-xml', body }
  }

  @Get('google.csv')
  @Public()
  @ApiOperation({ summary: 'Google Merchant CSV feed' })
  async googleCsv(@Headers('x-tenant-id') h: string) {
    const body = await this.svc.csv(tn(h))
    return { format: 'google-csv', body }
  }

  @Get('meta.csv')
  @Public()
  @ApiOperation({ summary: 'Meta (Facebook/Instagram) CSV product feed' })
  async metaCsv(@Headers('x-tenant-id') h: string) {
    const body = await this.svc.csv(tn(h))
    return { format: 'meta-csv', body }
  }
}
