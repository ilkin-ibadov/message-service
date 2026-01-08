import { Injectable, ForbiddenException, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, UpdateResult } from "typeorm";
import { v4 as uuid } from 'uuid'
import { Message } from "./message.entity";
import { MessageStatus } from "./message-status.entity";
import { ConversationService } from '../conversation/conversation.service'
import { RedisService } from "../redis/redis.service";
import { KafkaService } from "../kafka/kafka.service";
import { BlockService } from '../block/block.service'
import { MessageStatusEnum } from "./message-status.entity";

interface SendMessageInput {
    senderId: string,
    receiverId: string,
    content: string
}

interface MarkAsReadOutput {
    success: boolean
}

@Injectable()
export class MessageService {
    constructor(
        @InjectRepository(Message)
        private readonly messageRepo: Repository<Message>,

        @InjectRepository(MessageStatus)
        private readonly statusRepo: Repository<MessageStatus>,

        private readonly conversationService: ConversationService,
        private readonly blockService: BlockService,
        private readonly redisService: RedisService,
        private readonly kafkaService: KafkaService,
    ) { }

    // Send message from one user to another user
    async sendMessage(input: SendMessageInput): Promise<Message> {
        const { senderId, receiverId, content } = input

        // Block check
        const isBlocked = await this.blockService.isBlocked(senderId, receiverId)

        if (isBlocked) throw new ForbiddenException('You cannot message this user')

        // Get or create conversation
        const conversation = await this.conversationService.findOrCreate(senderId, receiverId)

        // Create message
        const message = this.messageRepo.create({
            id: uuid(),
            conversationId: conversation.id,
            senderId,
            receiverId,
            content
        })

        await this.messageRepo.save(message)


        // Create initial status (sent)
        const status = this.statusRepo.create({
            // id: uuid(),
            messageId: message.id,
            userId: receiverId,
            status: MessageStatusEnum.SENT
        })

        await this.statusRepo.save(status)


        // Check if receiver is online
        const isOnline = await this.redisService.isUserOnline(receiverId)

        if (isOnline) {
            await this.statusRepo.update(
                { messageId: message.id },
                { status: MessageStatusEnum.DELIVERED }
            )
        }

        await this.kafkaService.emit('message.sent', {
            messageId: message.id,
            senderId,
            receiverId,
            conversationId: conversation.id
        })

        return message
    }

    // Marks given message as read
    async markAsRead(messageId: string, userId: string): Promise<MarkAsReadOutput> {
        const status = await this.statusRepo.findOne({
            where: { messageId, userId }
        })

        if (!status) {
            throw new NotFoundException('Message status not found')
        }

        if (status.status === 'read') return { success: false }

        const updateResult: UpdateResult = await this.statusRepo.update({ messageId, userId }, { status: MessageStatusEnum.READ })
        const resultSuccessful: boolean = updateResult.affected === 1 ? true : false

        if (resultSuccessful) await this.kafkaService.emit('message.read', { messageId, userId })
        return { success: resultSuccessful }
    }

    // Get messages for a given conversation
    async getMessages(
        conversationId: string,
        limit: number,
        page: number
    ): Promise<Message[]> {
        const skip = (page - 1) * limit;

        return this.messageRepo.find({
            where: { conversationId },
            order: { createdAt: 'DESC' },
            take: limit,
            skip
        })
    }
}