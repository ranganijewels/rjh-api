import { Body, Controller, Post, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../../common/guards/roles.guard'
import { Roles } from '../../../common/decorators/roles.decorator'
import { AiCopyService } from '../services/ai-copy.service'
import { GenerateListingDto } from '../dto/generate-listing.dto'

@ApiTags('ai-copy')
@Controller('ai')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AiCopyController {
  constructor(private readonly aiCopyService: AiCopyService) {}

  @Post('generate-listing')
  @Roles('admin', 'manager', 'super_admin')
  @ApiBearerAuth()
  generateListing(@Body() dto: GenerateListingDto) {
    return this.aiCopyService.generateListing(dto)
  }
}
