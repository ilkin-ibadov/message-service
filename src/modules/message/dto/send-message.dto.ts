import { ApiProperty } from '@nestjs/swagger'

export class SendMessageDto {
    @ApiProperty({ description: 'Receiver user ID', example: 'uuid-v4' })
    receiverId: string

    @ApiProperty({ description: 'Message content', example: 'Hello there!' })
    content: string
}