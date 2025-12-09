import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class ToggleLikeDto {
  @ApiProperty({
    example: 'uuid-of-post',
    description: 'ID of the post being liked or unliked',
  })
  @IsUUID()
  postId: string;
}
