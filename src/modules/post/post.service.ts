import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Post } from './post.entity';
import { PostLike } from './like.entity';
import { PostReply } from './reply.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { extractMentions } from '../../utils/mention.util';
import { KafkaService } from '../kafka/kafka.service';
import { MongoService } from '../mongo/mongo.service';
import { RedisService } from '../redis/redis.service';
import { CreateReplyDto } from './dto/create-reply.dto';
import { UserReplicaService } from '../user-replica/user-replica.service';

@Injectable()
export class PostService {
  constructor(
    @InjectRepository(Post)
    private readonly postRepo: Repository<Post>,

    @InjectRepository(PostLike)
    private readonly likeRepo: Repository<PostLike>,

    @InjectRepository(PostReply)
    private readonly replyRepo: Repository<PostReply>,
    private readonly kafka: KafkaService,
    private readonly mongoService: MongoService,
    private readonly redisService: RedisService,
    private readonly userReplicaService: UserReplicaService,
  ) { }

  async resolveMentionsLocally(usernames: string[]) {
    const users = await this.userReplicaService.findManyByUsername(usernames);
    return users.map((user) => user.id);
  }

  async create(userId: string, dto: CreatePostDto) {
    const usernames = extractMentions(dto.content);
    const mentionUserIds = await this.userReplicaService.resolveMentionsLocally(usernames);

    const post = this.postRepo.create({
      userId,
      content: dto.content,
      mediaItems: dto.media || [],
      mentions: mentionUserIds,
    });
    const saved = await this.postRepo.save(post);

    await this.redisService.set(`post:${saved.id}`, saved, 3600);

    await this.kafka.produce('post.created', {
      postId: saved.id,
      userId: saved.userId,
    });

    await this.mongoService.log('info', 'Post created', {
      postId: saved.id,
      userId: saved.userId,
    });

    for (const mentionedUserId of mentionUserIds) {
      await this.kafka.produce('post.mention.created', {
        postId: saved.id,
        mentionedUserId,
        byUserId: saved.userId,
      });
    }

    return saved;
  }

  async findById(id: string) {
    // Try Redis cache first
    const cached = await this.redisService.get(`post:${id}`);
    if (cached) return cached;

    const post = await this.postRepo.findOne({ where: { id } });
    if (post) await this.redisService.set(`post:${id}`, post, 3600);
    return post;
  }

  async findAll(page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    // Try caching the feed page
    // const cacheKey = `posts:page:${page}:limit:${limit}`;
    // const cached = await this.redisService.get(cacheKey);
    // if (cached) return cached;

    const allPosts = await this.postRepo.find()

    const [posts, total] = await this.postRepo.findAndCount({
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    // console.log(posts)

    const result = {
      data: posts,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit),
      },
    };

    // await this.redisService.set(cacheKey, result, 300); // cache feed for 5 min
    return { data: allPosts };
  }

  async update(id: string, userId: string, dto: UpdatePostDto) {
    const post = await this.findById(id);
    if (!post) throw new BadRequestException('Post not found');
    if (post.userId !== userId) throw new ForbiddenException('Cannot edit others post');

    Object.assign(post, dto);
    const updated = await this.postRepo.save(post);

    // Update cache
    await this.redisService.set(`post:${id}`, updated, 3600);

    // Log update
    await this.mongoService.log('info', 'Post updated', {
      postId: updated.id,
      userId: updated.userId,
    });

    return updated;
  }

  async delete(postId: string, userId: string) {
    const post = await this.postRepo.findOne({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');
    if (post.userId !== userId) throw new BadRequestException('Unauthorized');

    await this.postRepo.softDelete(postId);

    // Remove cache
    await this.redisService.set(`post:${postId}`, null, 1);

    // Emit Kafka
    await this.kafka.produce('post.deleted', { postId, userId });

    // Log deletion
    await this.mongoService.log('info', 'Post deleted', {
      postId,
      userId,
    });

    return { deleted: true };
  }

  async likePost(postId: string, userId: string) {
    const exists = await this.likeRepo.findOne({ where: { postId, userId } });
    if (exists) throw new BadRequestException('Already liked');

    const like = this.likeRepo.create({ postId, userId });
    await this.likeRepo.save(like);

    await this.redisService.incr(`post:${postId}:likes`);

    await this.kafka.produce('post.liked', { postId, userId });

    return { liked: true };
  }

  async unlikePost(postId: string, userId: string) {
    await this.likeRepo.delete({ postId, userId });
    await this.redisService.decr(`post:${postId}:likes`);

    await this.kafka.produce('post.unliked', { postId, userId });

    return { unliked: true };
  }

  async reply(postId: string, userId: string, dto: CreateReplyDto) {
    const usernames = extractMentions(dto.content);
    const mentionUserIds = await this.userReplicaService.resolveMentionsLocally(usernames);

    const reply = this.replyRepo.create({
      postId,
      userId,
      content: dto.content,
      mediaItems: dto.media || [],
      mentions: mentionUserIds,
    });

    const saved = await this.replyRepo.save(reply);

    await this.redisService.incr(`post:${postId}:replies`);

    await this.kafka.produce('post.reply.created', {
      postId,
      replyId: saved.id,
      userId
    });

    return saved;
  }

  async getReplies(postId: string) {
    const replies = await this.replyRepo.find({
      where: { postId },
      order: { createdAt: 'ASC' },
    });

    return replies;
  }
}
