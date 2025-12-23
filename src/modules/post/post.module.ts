import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Post } from './post.entity';
import { PostLike } from './like.entity';
import { PostReply } from './reply.entity';
import { UserReplica } from '../user-replica/user-replica.entity';
import { PostService } from './post.service';
import { PostController } from './post.controller';
import { KafkaService } from '../kafka/kafka.service'
import { RedisService } from '../redis/redis.service';
import { MongoService } from '../mongo/mongo.service';
import { IdempotencyModule } from '../kafka/idempotency/idempotency.module';
import { UserReplicaModule } from '../user-replica/user-replica.module';

@Module({
  imports: [TypeOrmModule.forFeature([Post, PostLike, PostReply, UserReplica]), IdempotencyModule, UserReplicaModule],
  controllers: [PostController],
  providers: [
    PostService,
    KafkaService,
    RedisService,
    MongoService
  ],
})
export class PostModule { }
