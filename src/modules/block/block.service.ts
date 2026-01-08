import { Injectable, ForbiddenException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { UserBlock } from './block.entity'

@Injectable()
export class BlockService {
  constructor(
    @InjectRepository(UserBlock)
    private readonly blockRepo: Repository<UserBlock>,
  ) {}

  async blockUser(blockerId: string, blockedId: string): Promise<void> {
    if (blockerId === blockedId) return

    const exists = await this.blockRepo.findOne({
      where: { blockerId, blockedId },
    })

    if (!exists) {
      const block = this.blockRepo.create({ blockerId, blockedId })
      await this.blockRepo.save(block)
    }
  }

  async unblockUser(blockerId: string, blockedId: string): Promise<void> {
    await this.blockRepo.delete({ blockerId, blockedId })
  }

  async isBlocked(
    senderId: string,
    receiverId: string,
  ): Promise<boolean> {
    const block = await this.blockRepo.findOne({
      where: [
        { blockerId: receiverId, blockedId: senderId }, // receiver blocked sender
      ],
    })

    return !!block
  }

  async assertNotBlocked(
    senderId: string,
    receiverId: string,
  ): Promise<void> {
    const blocked = await this.isBlocked(senderId, receiverId)
    if (blocked) {
      throw new ForbiddenException('You are blocked by this user')
    }
  }

  async getBlockedUsers(userId: string): Promise<UserBlock[]> {
    return this.blockRepo.find({
      where: { blockerId: userId },
    })
  }
}
