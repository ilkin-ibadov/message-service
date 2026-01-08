import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    Index,
    UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

export enum MessageStatusEnum {
    SENT = 'sent',
    DELIVERED = 'delivered',
    READ = 'read'
}

@Entity('message_status')
@Index(['messageId', 'userId'], {unique: true})
export class MessageStatus {
    @ApiProperty({description: 'Unique id of status record', example: 'uuid-v4'})
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ApiProperty({description: 'ID of the message', example: 'uuid-v4'})
    @Column('uuid')
    messageId: string;

    @ApiProperty({description: 'User ID of the receiver', example: 'uuid-v4'})
    @Column('uuid')
    userId: string;

    @ApiProperty({description: 'Status of the message', enum: MessageStatusEnum, default: MessageStatusEnum.SENT})
    @Column({type: 'enum', enum: MessageStatusEnum, default: MessageStatusEnum.SENT})
    status: MessageStatusEnum

    @ApiProperty({description: 'When the status record was created', example: '2024-01-01T00:00:00Z'})
    @CreateDateColumn()
    createdAt: Date;

    @ApiProperty({description: 'When the status was last updated', example: '2024-01-01T00:00:00Z'})
    @UpdateDateColumn()
    updatedAt: Date;
}
