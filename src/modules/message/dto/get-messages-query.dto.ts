import { ApiPropertyOptional } from '@nestjs/swagger'

export class GetMessagesQueryDto {
  @ApiPropertyOptional({ description: 'Number of messages to return', example: 20 })
  limit?: number

  @ApiPropertyOptional({ description: 'Page of messages', example: 1 })
  page?: number
}