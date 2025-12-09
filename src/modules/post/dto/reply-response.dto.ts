import { ApiProperty } from '@nestjs/swagger';

export class ReplyResponseDto {
  @ApiProperty({ example: 'uuid-of-reply' })
  id: string;

  @ApiProperty({ example: 'uuid-of-post' })
  postId: string;

  @ApiProperty({ example: 'uuid-of-user' })
  userId: string;

  @ApiProperty({ example: 'This is a reply text' })
  text: string;

  @ApiProperty({ example: '2024-01-10T12:00:00Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-10T12:00:00Z' })
  updatedAt: Date;
}
