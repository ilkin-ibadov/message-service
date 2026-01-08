import { Module } from '@nestjs/common';
import { MessageModule } from './modules/message/message.module';
import { RedisModule } from "./modules/redis/redis.module"
import { KafkaModule } from "./modules/kafka/kafka.module"
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from "@nestjs/typeorm";
import { typeOrmConfig } from "./ormconfig"

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MessageModule,
    RedisModule,
    KafkaModule,
    TypeOrmModule.forRoot(typeOrmConfig),
  ],
})
export class AppModule { }
