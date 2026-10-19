import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  Headers,
  UseGuards,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { ReviewsService } from './reviews.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { Public } from '../../common/decorators/public.decorator'

const T = '00000000-0000-0000-0000-000000000001'
const tn = (u?: string, h?: string) => u || h || T

@ApiTags('reviews')
@Controller('reviews')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReviewsController {
  constructor(private readonly svc: ReviewsService) {}

  @Post()
  @Public()
  @ApiOperation({ summary: 'Submit a product review (storefront)' })
  submit(@Headers('x-tenant-id') h: string, @Body() body: any) {
    return this.svc.submit(tn(undefined, h), body)
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'List reviews; approved-only unless status given' })
  list(@Headers('x-tenant-id') h: string, @Query() q: any) {
    const tenantId = tn(undefined, h)
    if (q?.status) {
      return this.svc.listAll(tenantId, { status: q.status })
    }
    return this.svc.listApproved(tenantId, q?.productId)
  }

  @Get('summary')
  @Public()
  @ApiOperation({ summary: 'Review summary (count + average) for a product' })
  summary(@Headers('x-tenant-id') h: string, @Query('productId') productId: string) {
    return this.svc.summary(tn(undefined, h), productId)
  }

  @Put(':id/moderate')
  @Roles('admin', 'manager')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Moderate a review (approve/reject)' })
  moderate(
    @Headers('x-tenant-id') h: string,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.svc.moderate(tn(undefined, h), id, body?.status)
  }

  @Delete(':id')
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a review' })
  remove(@Headers('x-tenant-id') h: string, @Param('id') id: string) {
    return this.svc.remove(tn(undefined, h), id)
  }
}
