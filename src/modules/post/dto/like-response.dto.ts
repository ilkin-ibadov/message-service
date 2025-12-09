import { ApiProperty } from '@nestjs/swagger';

export class LikeResponseDto {
  @ApiProperty({ example: 'uuid-of-like' })
  id: string;

  @ApiProperty({ example: 'uuid-of-post' })
  postId: string;

  @ApiProperty({ example: 'uuid-of-user' })
  userId: string;

  @ApiProperty({ example: '2024-01-10T12:00:00Z' })
  createdAt: Date;
}
