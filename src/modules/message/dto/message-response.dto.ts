import { ApiProperty } from '@nestjs/swagger'
import { MessageType } from '../message.entity'

export class MessageResponseDto {
  @ApiProperty({ description: 'Message ID', example: 'uuid-v4' })
  id: string

  @ApiProperty({ description: 'Conversation ID', example: 'uuid-v4' })
  conversationId: string

  @ApiProperty({ description: 'Sender ID', example: 'uuid-v4' })
  senderId: string

  @ApiProperty({ description: 'Receiver ID', example: 'uuid-v4' })
  receiverId: string

  @ApiProperty({ description: 'Message content', example: 'Hello there!' })
  content: string

  @ApiProperty({ description: 'Message type', enum: MessageType })
  type: MessageType

  @ApiProperty({ description: 'Message created timestamp', example: '2025-12-28T12:34:56Z' })
  createdAt: Date

  @ApiProperty({ description: 'Message edited timestamp', example: '2025-12-28T12:40:00Z', required: false })
  editedAt?: Date
}