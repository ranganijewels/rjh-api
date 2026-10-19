import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AiSalesLead } from '../../database/entities/ai-sales-lead.entity'
import { AiSalesMessage } from '../../database/entities/ai-sales-message.entity'
import { AiSalesAgentSettings } from '../../database/entities/ai-sales-agent-settings.entity'
import { AiSalesService } from './ai-sales.service'
import { AiSalesController } from './ai-sales.controller'

@Module({
  imports: [TypeOrmModule.forFeature([AiSalesLead, AiSalesMessage, AiSalesAgentSettings])],
  providers: [AiSalesService],
  controllers: [AiSalesController],
  exports: [AiSalesService],
})
export class AiSalesModule {}
