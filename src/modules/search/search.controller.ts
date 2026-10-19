import { Controller, Get, Query, Headers, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Public } from '../../common/decorators/public.decorator'
import { SearchService } from './search.service'

const T = '00000000-0000-0000-0000-000000000001'
const tn = (u?: string, h?: string) => u || h || T

@ApiTags('search')
@Controller('search')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SearchController {
  constructor(private readonly svc: SearchService) {}

  @Get('products')
  @Public()
  @ApiOperation({ summary: 'Postgres-backed product search (storefront)' })
  searchProducts(@Headers('x-tenant-id') h: string, @Query() q: any) {
    return this.svc.search(tn(undefined, h), q)
  }

  @Get('facets')
  @Public()
  @ApiOperation({ summary: 'Available facet values with counts' })
  facets(@Headers('x-tenant-id') h: string) {
    return this.svc.facets(tn(undefined, h))
  }

  @Get('autocomplete')
  @Public()
  @ApiOperation({ summary: 'Typeahead product + catalog suggestions' })
  autocomplete(@Headers('x-tenant-id') h: string, @Query('q') q: string) {
    return this.svc.autocomplete(tn(undefined, h), q)
  }
}
