import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Repository, DataSource, IsNull } from 'typeorm';
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
    private readonly dataSource: DataSource, // needed for transactions
  ) { }

  private async hydratePostCounters(post: Post) {
    const [likeCount, replyCount] = await Promise.all([
      this.redisService.get(`post:${post.id}:likeCount`),
      this.redisService.get(`post:${post.id}:replyCount`),
    ]);

    return {
      ...post,
      likeCount: likeCount !== null ? Number(likeCount) : post.likeCount,
      replyCount: replyCount !== null ? Number(replyCount) : post.replyCount,
    };
  }

  private async hydrateAndCachePosts(posts: Post[]) {
    return Promise.all(
      posts.map(async (post) => {
        await this.redisService.set(`post:${post.id}`, post, 3600);
        return this.hydratePostCounters(post);
      }),
    );
  }

  async resolveMentionsLocally(usernames: string[]) {
    const users = await this.userReplicaService.findManyByUsername(usernames);
    return users.map((user) => user.id);
  }

  async create(userId: string, dto: CreatePostDto) {
    const usernames = extractMentions(dto.content);
    const mentionUserIds =
      await this.userReplicaService.resolveMentionsLocally(usernames);

    const post = this.postRepo.create({
      userId,
      content: dto.content,
      mediaItems: dto.media || [],
      mentions: mentionUserIds,
    });

    const saved = await this.postRepo.save(post);

    // Cache full post (NO counters)
    await this.redisService.set(
      `post:${saved.id}`,
      {
        ...saved,
        likeCount: undefined,
        replyCount: undefined,
      },
      3600,
    );

    // Initialize counters in Redis
    await Promise.all([
      this.redisService.set(`post:${saved.id}:likeCount`, saved.likeCount ?? 0),
      this.redisService.set(`post:${saved.id}:replyCount`, saved.replyCount ?? 0),
    ]);

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
    let post = await this.redisService.get(`post:${id}`);

    if (!post) {
      post = await this.postRepo.findOne({ where: { id } });
      if (!post) return null;

      await this.redisService.set(`post:${id}`, post, 3600);
    }

    return this.hydratePostCounters(post);
  }

  async findAll(page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [posts, total] = await this.postRepo.findAndCount({
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    const hydrated = await Promise.all(
      posts.map(async (post) => {
        await this.redisService.set(`post:${post.id}`, post, 3600);
        return this.hydratePostCounters(post);
      }),
    );

    return {
      data: hydrated,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit),
      },
    };
  }

  async findMyPosts(userId: string, page = 1, limit = 10) {
    const cacheKey = `myPosts:${userId}:page:${page}:limit:${limit}`;
    const cachedIds = await this.redisService.get(cacheKey);

    let posts: Post[];
    let total: number;

    if (cachedIds) {
      posts = await Promise.all(
        cachedIds.map((id) => this.findById(id)),
      );
      total = await this.postRepo.count({ where: { userId } });
    } else {
      const skip = (page - 1) * limit;

      const result = await this.postRepo.findAndCount({
        where: { userId },
        order: { createdAt: 'DESC' },
        skip,
        take: limit,
      });

      console.log("Query Result: ", result)

      posts = result[0];
      total = result[1];

      await this.redisService.set(
        cacheKey,
        posts.map((p) => p.id),
        300,
      );
    }

    const hydrated = await this.hydrateAndCachePosts(posts);

    return {
      data: hydrated,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit),
      },
    };
  }

  async feed(userId: string, page = 1, limit = 10) {
    const cacheKey = `feed:${userId}:page:${page}:limit:${limit}`;
    const cachedIds = await this.redisService.get(cacheKey);

    let posts: Post[];

    if (cachedIds) {
      posts = await Promise.all(
        cachedIds.map((id) => this.findById(id)),
      );
    } else {
      const offset = (page - 1) * limit;

      posts = await this.postRepo
        .createQueryBuilder('post')
        .distinctOn(['post.userId'])
        .where('post.userId != :userId', { userId })
        .andWhere('post.deletedAt IS NULL')
        .orderBy('post.userId')
        .addOrderBy('post.createdAt', 'DESC')
        .offset(offset)
        .limit(limit)
        .getMany();

      await this.redisService.set(
        cacheKey,
        posts.map((p) => p.id),
        300,
      );
    }

    const hydrated = await this.hydrateAndCachePosts(posts);

    return {
      data: hydrated,
      meta: {
        page,
        limit,
        hasMore: hydrated.length === limit,
      },
    };
  }

  async update(id: string, userId: string, dto: UpdatePostDto) {
    const post = await this.postRepo.findOne({ where: { id } });
    if (!post) throw new NotFoundException('Post not found');
    if (post.userId !== userId)
      throw new ForbiddenException('Cannot edit others post');

    Object.assign(post, dto);
    const updated = await this.postRepo.save(post);

    // Update cached post (NO counters)
    await this.redisService.set(
      `post:${id}`,
      {
        ...updated,
        likeCount: undefined,
        replyCount: undefined,
      },
      3600,
    );

    await this.mongoService.log('info', 'Post updated', {
      postId: updated.id,
      userId,
    });

    return updated;
  }

  async delete(postId: string, userId: string) {
    const post = await this.postRepo.findOne({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');
    if (post.userId !== userId) throw new ForbiddenException('You cannot delete this post');

    await this.postRepo.softDelete(postId);
    await this.redisService.del(`post:${postId}`);
    await this.kafka.produce('post.deleted', { postId, userId });
    await this.mongoService.log('info', 'Post deleted', { postId, userId });

    return { deleted: true };
  }

  // --- Atomic like/unlike using transaction ---
  async likePost(postId: string, userId: string) {
    return this.dataSource.transaction(async (manager) => {
      const post = await manager.findOne(Post, { where: { id: postId } });
      if (!post) throw new NotFoundException('Post not found');

      const exists = await manager.findOne(PostLike, { where: { postId, userId } });
      if (exists) throw new BadRequestException('Already liked');

      await manager.insert(PostLike, { postId, userId });
      await manager.increment(Post, { id: postId }, 'likeCount', 1);

      // Update Redis atomically after DB transaction
      await this.redisService.set(`post:${postId}:likeCount`, post.likeCount + 1);

      await this.kafka.produce('post.liked', { postId, userId });
      return { liked: true };
    });
  }

  async unlikePost(postId: string, userId: string) {
    return this.dataSource.transaction(async (manager) => {
      const post = await manager.findOne(Post, { where: { id: postId } });
      if (!post) throw new NotFoundException('Post not found');

      const deleted = await manager.delete(PostLike, { postId, userId });
      if (deleted.affected) {
        await manager.decrement(Post, { id: postId }, 'likeCount', 1);

        await this.redisService.set(`post:${postId}:likeCount`, post.likeCount - 1);

        await this.kafka.produce('post.unliked', { postId, userId });
      }
      return { unliked: true };
    });
  }

  async getLikes(postId: string) {
    const exists = await this.postRepo.exists({ where: { id: postId } });
    if (!exists) throw new NotFoundException('Post not found');

    return this.likeRepo
      .createQueryBuilder('like')
      .innerJoin('like.user', 'user')
      .where('like.postId = :postId', { postId })
      .select([
        'like.id',
        'like.userId',
        'like.createdAt',
        'user.id',
        'user.username',
      ])
      .orderBy('like.createdAt', 'ASC')
      .getMany();
  }

  async reply(postId: string, userId: string, dto: CreateReplyDto) {
    return this.dataSource.transaction(async (manager) => {
      const post = await manager.findOne(Post, { where: { id: postId } });
      if (!post) throw new NotFoundException('Post not found');

      const usernames = extractMentions(dto.content);
      const mentionUserIds = await this.userReplicaService.resolveMentionsLocally(usernames);

      const reply = manager.create(PostReply, { postId, userId, content: dto.content, mediaItems: dto.media || [], mentions: mentionUserIds });
      const saved = await manager.save(reply);

      await manager.increment(Post, { id: postId }, 'replyCount', 1);
      await this.redisService.set(`post:${postId}:replyCount`, post.replyCount + 1);

      await this.kafka.produce('post.reply.created', { postId, replyId: saved.id, userId });
      return saved;
    });
  }

  async deleteReply(replyId: string, userId: string) {
    // Fetch only non-deleted replies
    const reply = await this.replyRepo.findOne({
      where: {
        id: replyId,
        deletedAt: IsNull(),
      },
    });

    if (!reply) {
      throw new NotFoundException('Reply not found');
    }

    if (reply.userId !== userId) {
      throw new ForbiddenException('Cannot delete others reply');
    }

    return this.dataSource.transaction(async (manager) => {
      // Delete reply (soft or hard, depending on entity config)
      await manager.delete(PostReply, { id: replyId });

      // Safe, atomic decrement (never below 0)
      await manager
        .createQueryBuilder()
        .update(Post)
        .set({
          replyCount: () => `GREATEST(replyCount - 1, 0)`,
        })
        .where('id = :postId', { postId: reply.postId })
        .execute();

      // Fetch updated post for Redis sync
      const post = await manager.findOne(Post, {
        where: { id: reply.postId },
        select: ['id', 'replyCount'],
      });

      if (post) {
        await this.redisService.set(
          `post:${post.id}:replyCount`,
          Math.max(post.replyCount, 0),
        );
      }

      // Emit event after successful transaction logic
      await this.kafka.produce('post.reply.deleted', {
        postId: reply.postId,
        replyId,
        userId,
      });

      return { replyDeleted: true };
    });
  }

  async getReplies(postId: string) {
    const exists = await this.postRepo.exists({ where: { id: postId } });
    if (!exists) throw new NotFoundException('Post not found');

    return this.replyRepo
      .createQueryBuilder('reply')
      .innerJoin('reply.user', 'user')
      .where('reply.postId = :postId')
      .andWhere('reply.deletedAt IS NULL')
      .setParameter('postId', postId)
      .select([
        'reply.id',
        'reply.userId',
        'reply.content',
        'reply.mediaItems',
        'reply.mentions',
        'reply.createdAt',
        'reply.updatedAt',
        'user.id',
        'user.username',
      ])
      .orderBy('reply.createdAt', 'ASC')
      .getMany();
  }
}
