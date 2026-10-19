import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Quote } from '../../database/entities/quote.entity'
import { QuoteService } from './quotes.service'
import { QuoteController } from './quotes.controller'

@Module({
  imports: [TypeOrmModule.forFeature([Quote])],
  providers: [QuoteService],
  controllers: [QuoteController],
  exports: [QuoteService],
})
export class QuotesModule {}
