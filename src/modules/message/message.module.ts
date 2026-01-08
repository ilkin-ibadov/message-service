import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Message } from './message.entity';
import { MessageStatus } from './message-status.entity';
import { MessageService } from './message.service';
import { MessageController } from './message.controller';
import { MessageGateway } from './message.gateway'
import { KafkaModule } from '../kafka/kafka.module'
import { RedisModule } from '../redis/redis.module';
import { ConversationModule } from "../conversation/conversation.module"
import { BlockModule } from '../block/block.module'

@Module({
  imports: [TypeOrmModule.forFeature([Message, MessageStatus]), RedisModule, KafkaModule, ConversationModule, BlockModule],
  controllers: [MessageController],
  providers: [
    MessageService,
    MessageGateway
  ],
  exports: [MessageService]
})
export class MessageModule { }
