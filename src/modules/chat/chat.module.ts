import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ChatConversation } from '../../database/entities/chat-conversation.entity'
import { ChatMessage } from '../../database/entities/chat-message.entity'
import { ChatService } from './chat.service'
import { ChatController, StorefrontChatController } from './chat.controller'

@Module({
  imports: [TypeOrmModule.forFeature([ChatConversation, ChatMessage])],
  providers: [ChatService],
  controllers: [StorefrontChatController, ChatController],
  exports: [ChatService],
})
export class ChatModule {}
