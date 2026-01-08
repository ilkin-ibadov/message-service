import { ApiProperty } from '@nestjs/swagger';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, Index } from 'typeorm';

export enum MediaType {
  IMAGE = 'image',
  VIDEO = 'video',
  FILE = 'file'
}

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO = 'video',
  FILE = 'file'
}

@Entity('messages')
@Index(['conversationId', 'createdAt'])
@Index(['receiverId', 'status'])
export class Message {
  @ApiProperty({ description: 'Unique message ID', example: 'uuid-v4' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Conversation ID this message belongs to', example: 'uuid-v4' })
  @Column('uuid')
  conversationId: string;

  @ApiProperty({ description: 'Sender user ID', example: 'uuid-v4' })
  @Column('uuid')
  senderId: string;

  @ApiProperty({ description: 'Receiver user ID', example: 'uuid-v4' })
  @Column('uuid')
  receiverId: string;

  @ApiProperty({ description: 'Message content', example: 'Hello there!' })
  @Column({ type: 'text' })
  content: string;

  @ApiProperty({ description: 'Message type', enum: MessageType, default: MessageType.TEXT })
  @Column({ type: 'enum', enum: MessageType, default: MessageType.TEXT })
  type: MessageType

  @ApiProperty({ description: 'Media items in a message' })
  @Column({ type: 'jsonb', nullable: true })
  mediaItems: Array<{
    mediaId: string;
    url: string;
    type: MediaType;
  }>;

  @ApiProperty({ description: 'When the message was created', example: '2024-01-01T00:00:00Z' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: 'When the message was last updated', example: '2024-01-01T00:00:00Z', required: false })
  @UpdateDateColumn()
  updatedAt?: Date;

  @ApiProperty({ description: 'When the message was deleted', example: '2024-01-01T00:00:00Z', required: false })
  @DeleteDateColumn()
  deletedAt?: Date;
}
