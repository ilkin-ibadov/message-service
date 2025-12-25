import {
  Controller,
  Post,
  Body,
  Req,
  Get,
  Param,
  Delete,
  Query,
  Patch,
  UseGuards
} from '@nestjs/common';
import { PostService } from './post.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import {
  ApiTags,
  ApiQuery,
  ApiOperation,
  ApiResponse,
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Post as PostEntity } from './post.entity';
import { PostLike } from './like.entity';
import { PostReply } from './reply.entity';
import { CreateReplyDto } from './dto/create-reply.dto';
import { JwtAuthGuard } from '../../middlewares/auth.guard';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@ApiTags('Posts')
@Controller('posts')
export class PostController {
  constructor(private readonly postService: PostService) { }

  @Post()
  @ApiOperation({ summary: 'Create a new post' })
  @ApiResponse({
    status: 201,
    description: 'Post created successfully.',
    type: PostEntity,
  })
  @ApiBadRequestResponse({ description: 'Validation failed.' })
  create(@Req() req, @Body() dto: CreatePostDto) {
    return this.postService.create(req.user.sub, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a post by ID' })
  @ApiOkResponse({ description: 'The post.', type: PostEntity })
  @ApiNotFoundResponse({ description: 'Post not found.' })
  getById(@Param('id') id: string) {
    return this.postService.findById(id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all posts with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiOkResponse({ description: 'List of posts.', type: [PostEntity] })
  getAll(
    @Query('page') page = 1,
    @Query('limit') limit = 10
  ) {
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;
    return this.postService.findAll(pageNum, limitNum);
  }

  @Get('me')
  @ApiOperation({
    summary: 'Get my posts',
    description: 'Returns paginated posts created by the authenticated user.',
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiResponse({
    status: 200,
    description: 'User posts fetched successfully',
  })
  getMyPosts(
    @Req() req: any,
    @Query('page') page = 1,
    @Query('limit') limit = 10
  ) {
    return this.postService.findMyPosts(req.user.sub, page, limit);
  }

  @Get('feed')
  @ApiOperation({
    summary: 'Get feed',
    description:
      'Returns a mixed feed with at most one post per user, excluding the authenticated user’s posts.',
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiResponse({
    status: 200,
    description: 'Feed fetched successfully',
  })
  async getFeed(
    @Req() req: any,
    @Query('page') page = 1,
    @Query('limit') limit = 10
  ) {
    return this.postService.feed(req.user.sub, page, limit);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a post' })
  @ApiOkResponse({
    description: 'Post updated successfully.',
    type: PostEntity,
  })
  @ApiNotFoundResponse({ description: 'Post not found.' })
  @ApiBadRequestResponse({ description: 'Validation failed.' })
  update(@Param('id') id: string, @Req() req, @Body() dto: UpdatePostDto) {
    return this.postService.update(id, req.user.sub, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a post' })
  @ApiOkResponse({ description: 'Post deleted successfully.' })
  @ApiNotFoundResponse({ description: 'Post not found.' })
  delete(@Param('id') id: string, @Req() req) {
    return this.postService.delete(id, req.user.sub);
  }

  @Post(":id/like")
  @ApiOperation({ summary: 'Like a post' })
  @ApiOkResponse({ description: 'Post liked successfully', type: PostLike })
  @ApiNotFoundResponse({ description: 'Post not found' })
  likePost(@Param('id') id: string, @Req() req) {
    return this.postService.likePost(id, req.user.sub)
  }

  @Post(":id/unlike")
  @ApiOperation({ summary: 'Unlike a post' })
  @ApiOkResponse({ description: 'Post unliked successfully', type: PostLike })
  @ApiNotFoundResponse({ description: 'Post not found' })
  unlikePost(@Param('id') id: string, @Req() req) {
    return this.postService.unlikePost(id, req.user.sub)
  }

  @Get(':id/likes')
  @ApiOperation({ summary: 'Get all likes of a post' })
  @ApiOkResponse({ description: 'List of likes', type: [PostLike] })
  @ApiNotFoundResponse({ description: 'Post not found' })
  getLikes(@Param('id') id: string) {
    return this.postService.getLikes(id)
  }

  @Post(":id/reply")
  @ApiOperation({ summary: 'Reply to a post' })
  @ApiOkResponse({ description: 'Reply created successfully', type: PostReply })
  @ApiNotFoundResponse({ description: 'Post not found' })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  reply(@Param('id') id: string, @Req() req, @Body() dto: CreateReplyDto) {
    return this.postService.reply(id, req.user.sub, dto)
  }

  @Delete(":replyId/reply/delete")
  @ApiOperation({ summary: 'Delete a reply' })
  @ApiOkResponse({ description: 'Reply successfully deleted' })
  @ApiNotFoundResponse({ description: 'Post not found' })
  deleteReply(@Param('replyId') replyId: string, @Req() req) {
    return this.postService.deleteReply(replyId, req.user.sub)
  }

  @Get(':id/replies')
  @ApiOperation({ summary: 'Get all replies of a post' })
  @ApiOkResponse({ description: 'List of replies', type: [PostReply] })
  @ApiNotFoundResponse({ description: 'Post not found' })
  getReplies(@Param('id') id: string) {
    return this.postService.getReplies(id)
  }
}
