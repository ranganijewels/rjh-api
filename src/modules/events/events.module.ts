import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { DomainEvent } from '../../database/entities/domain-event.entity'
import { EventsService } from './events.service'
import { EventsController } from './events.controller'

@Module({
  imports: [TypeOrmModule.forFeature([DomainEvent])],
  providers: [EventsService],
  controllers: [EventsController],
  exports: [EventsService],
})
export class EventsModule {}
