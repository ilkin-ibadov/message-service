import { Inject, Injectable } from '@nestjs/common'
import Redis from 'ioredis'

@Injectable()
export class RedisService {
    constructor(@Inject('REDIS') private readonly client: Redis) { }

    // Set user online
    async setUserOnline(userId: string): Promise<void> {
        await this.client.set(`user:online:${userId}`, '1')
    }

    // Set user offline
    async setUserOffline(userId: string): Promise<void> {
        await this.client.del(`user:online:${userId}`)
    }

    // Check if user is online
    async isUserOnline(userId: string): Promise<boolean> {
        const res = await this.client.get(`user:online:${userId}`)
        return res === '1'
    }

    // Optional: store socket ID for user
    async setUserSocket(userId: string, socketId: string): Promise<void> {
        await this.client.set(`user:socket:${userId}`, socketId)
    }

    async getUserSocket(userId: string): Promise<string | null> {
        return this.client.get(`user:socket:${userId}`)
    }
}