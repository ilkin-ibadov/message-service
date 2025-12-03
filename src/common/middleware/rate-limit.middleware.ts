import { Injectable, NestMiddleware, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { Inject } from '@nestjs/common';

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  constructor(@Inject('REDIS') private readonly redis) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // rate limit by ip for all requests - basic example
    try {
      const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
      const key = `rl:ip:${ip}`;
      const window = 60; // 60s
      const max = 300; // allow 300 requests per window
      const requests = await this.redis.incr(key);
      if (requests === 1) {
        await this.redis.expire(key, window);
      }
      if (requests > max) {
        throw new HttpException('Too many requests', HttpStatus.TOO_MANY_REQUESTS);
      }
      next();
    } catch (err) {
      next(err);
    }
  }
}
