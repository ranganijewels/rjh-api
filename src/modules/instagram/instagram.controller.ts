import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { InstagramService } from './instagram.service'
import { Public } from '../../common/decorators/public.decorator'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'

@ApiTags('instagram')
@Controller('instagram')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InstagramController {
  constructor(private readonly instagramService: InstagramService) {}

  @Public()
  @Get('feed')
  @ApiOperation({ summary: 'Get Instagram feed — cached 1h' })
  async getFeed(@Query('limit') limit?: string) {
    const media = await this.instagramService.getFeed(Number(limit) || 12)
    return { data: media }
  }

  @Post('refresh-token')
  @Roles('admin', 'super_admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Refresh long-lived Instagram access token' })
  async refreshToken() {
    return this.instagramService.refreshToken()
  }

  @Post('clear-cache')
  @Roles('admin', 'super_admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Clear cached Instagram feed (force re-fetch)' })
  async clearCache() {
    await this.instagramService.clearCache()
    return { success: true }
  }
}
