import { Module } from '@nestjs/common'
import { AiCopyController } from './controllers/ai-copy.controller'
import { AiCopyService } from './services/ai-copy.service'

@Module({
  controllers: [AiCopyController],
  providers: [AiCopyService],
})
export class AiCopyModule {}
