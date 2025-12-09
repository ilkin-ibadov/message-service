import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Post } from './post.entity';
import { PostService } from './post.service';
import { PostController } from './post.controller';
import { KafkaProducerService } from '../kafka/kafka.service'
import { PostLike } from './like.entity';
import { PostReply } from './reply.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Post, PostLike, PostReply])],
  controllers: [PostController],
  providers: [PostService, KafkaProducerService],
})
export class PostModule {}
