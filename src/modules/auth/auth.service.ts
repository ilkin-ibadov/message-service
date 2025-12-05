import { Injectable, UnauthorizedException, Inject, BadRequestException } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'crypto';
import { Redis } from 'ioredis';
import { KafkaService } from '../kafka/kafka.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UserService,
    private jwtService: JwtService,
    @Inject('REDIS') private readonly redisClient: Redis,
    private kafkaService: KafkaService,
  ) {}

  private parseExpiration(exp: string) {
    if (exp.endsWith('d')) return Number(exp.slice(0, -1)) * 86400;
    if (exp.endsWith('h')) return Number(exp.slice(0, -1)) * 3600;
    if (exp.endsWith('m')) return Number(exp.slice(0, -1)) * 60;
    if (exp.endsWith('s')) return Number(exp.slice(0, -1));
    const n = Number(exp);
    return isNaN(n) ? 7 * 86400 : n;
  }

  // Register returns user and triggers verification email in UsersService
  async login(email: string, password: string, ip?: string, device?: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    // rate limit check by email
    const key = `rl:login:${email}`;
    const window = Number(process.env.RATE_LIMIT_LOGIN_WINDOW || 600); // seconds
    const max = Number(process.env.RATE_LIMIT_LOGIN_MAX || 5);
    const requests = await this.redisClient.incr(key);
    if (requests === 1) {
      await this.redisClient.expire(key, window);
    }
    if (requests > max) {
      // log and send security event (Kafka)
      await this.kafkaService.produce('auth.security.alert', { type: 'bruteforce', email, ip, createdAt: new Date() });
      throw new UnauthorizedException('Too many attempts. Try again later.');
    }

    const valid = await this.usersService.verifyPassword(user, password);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (!user.isVerified) throw new UnauthorizedException('Email not verified');

    // create tokens
    const payload = { sub: user.id, email: user.email };
    const accessToken = this.jwtService.sign(payload);

    const refreshToken = randomBytes(64).toString('hex');

    // create session in DB with hashed refresh token
    const session = await this.usersService.createSession(user, refreshToken, ip, device);

    // Optionally also store refresh token => sessionId mapping in redis for fast lookup
    const redisKey = `refresh:session:${session.id}`;
    const ttlSeconds = this.parseExpiration(process.env.JWT_REFRESH_TOKEN_EXPIRATION!);
    await this.redisClient.set(redisKey, session.id, 'EX', ttlSeconds);

    return { accessToken, refreshToken, sessionId: session.id, expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRATION!};
  }

  // Rotate refresh tokens: find session by matching provided refresh token
  async refresh(oldRefreshToken: string) {
    if (!oldRefreshToken) throw new BadRequestException('Refresh token required');
    const session = await this.usersService.findSessionByRefreshToken(oldRefreshToken);
    if (!session || session.revoked) throw new UnauthorizedException('Invalid refresh token');

    // revoke old session entry
    session.revoked = true;
    session.revokedAt = new Date();
    await this.usersService['sessionRepo'].save(session); // slight internal access; alternately add method

    // create new session and token
    const user = await this.usersService.findById(session.userId);
    if (!user) throw new UnauthorizedException('User not found');

    const newRefresh = randomBytes(64).toString('hex');
    const newSession = await this.usersService.createSession(user, newRefresh, session.ip, session.device);

    const payload = { sub: user.id, email: user.email };
    const accessToken = this.jwtService.sign(payload);

    // cleanup older redis mapping if exists
    await this.redisClient.del(`refresh:session:${session.id}`);
    const ttlSeconds = this.parseExpiration(process.env.JWT_REFRESH_TOKEN_EXPIRATION!);
    await this.redisClient.set(`refresh:session:${newSession.id}`, newSession.id, 'EX', ttlSeconds);

    return { accessToken, refreshToken: newRefresh, sessionId: newSession.id };
  }

  async logout(refreshToken: string) {
    // find session and revoke it
    const session = await this.usersService.findSessionByRefreshToken(refreshToken);
    if (!session) return; // idempotent
    await this.usersService.revokeSession(session.id);
    await this.redisClient.del(`refresh:session:${session.id}`);
  }
}
