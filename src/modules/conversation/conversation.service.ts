import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Conversation } from './conversation.entity'

@Injectable()
export class ConversationService {
  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepo: Repository<Conversation>,
  ) { }

  private normalizeUsers(userA: string, userB: string): [string, string] {
    return userA < userB ? [userA, userB] : [userB, userA]
  }

  async findOrCreate(
    senderId: string,
    receiverId: string,
  ): Promise<Conversation> {
    const [user1, user2] = this.normalizeUsers(senderId, receiverId)

    let conversation = await this.conversationRepo.findOne({
      where: {
        senderId: user1,
        receiverId: user2,
      },
    })

    if (!conversation) {
      conversation = this.conversationRepo.create({
        senderId: user1,
        receiverId: user2,
      })
      await this.conversationRepo.save(conversation)
    }

    return conversation
  }

  async getOrCreateConversation(
    userA: string,
    userB: string,
  ): Promise<Conversation> {
    const [senderId, receiverId] = this.normalizeUsers(userA, userB)

    let conversation = await this.conversationRepo.findOne({
      where: { senderId, receiverId },
    })

    if (!conversation) {
      conversation = this.conversationRepo.create({
        senderId,
        receiverId,
      })
      await this.conversationRepo.save(conversation)
    }

    return conversation
  }

  async getUserConversations(userId: string): Promise<Conversation[]> {
    return this.conversationRepo.find({
      where: [
        { senderId: userId },
        { receiverId: userId },
      ],
      order: { updatedAt: 'DESC' },
    })
  }

  async getConversationById(id: string): Promise<Conversation | null> {
    return this.conversationRepo.findOne({ where: { id } })
  }
}
