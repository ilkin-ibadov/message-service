import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService {
    constructor(@Inject('REDIS') private readonly redis: Redis) {}

    async get(key: string) {
        const data = await this.redis.get(key);
        return data ? JSON.parse(data) : null;
    }

    async set(key: string, value: any, ttlSeconds?: number) {
        const stringValue = JSON.stringify(value);
        if (ttlSeconds) {
            await this.redis.set(key, stringValue, 'EX', ttlSeconds);
        } else {
            await this.redis.set(key, stringValue);
        }
    }

    async lpush(key: string, value: any) {
        await this.redis.lpush(key, JSON.stringify(value));
    }

    async rpop(key: string) {
        const val = await this.redis.rpop(key);
        return val ? JSON.parse(val) : null;
    }

    async incr(key: string) {
        return this.redis.incr(key);
    }

    async decr(key: string) {
        return this.redis.decr(key);
    }

    async del(key: string) {
        return this.redis.del(key);
    }
}
