import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserModule } from '../user/user.module';
import { JwtStrategy } from './jwt.strategy';
import { RedisModule } from '../redis/redis.module';

@Module({
    imports: [
        PassportModule,
        JwtModule.register({
            secret: process.env.JWT_ACCESS_TOKEN_SECRET,
            signOptions: { expiresIn: Number(process.env.JWT_ACCESS_TOKEN_EXPIRATION) },
        }),
        UserModule,
        RedisModule,
    ],
    providers: [AuthService, JwtStrategy],
    controllers: [AuthController],
})
export class AuthModule { }
