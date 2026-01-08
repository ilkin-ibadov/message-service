import { Controller, Post, Get, Body, Param, Query, Req, UseGuards } from "@nestjs/common";
import { MessageService } from './message.service'
import { JwtAuthGuard } from "../../middlewares/auth.guard";
import { MessageResponseDto } from './dto/message-response.dto'
import { SendMessageDto } from './dto/send-message.dto'
import { GetMessagesQueryDto } from './dto/get-messages-query.dto'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiBody, ApiQuery, ApiParam } from "@nestjs/swagger";

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@ApiTags('Messages')
@Controller('messages')
export class MessageController {
    constructor(private readonly messageService: MessageService) { }

    // Send a message
    @Post()
    @ApiOperation({ summary: 'Send a new message to another user' })
    @ApiResponse({ status: 201, description: 'Message successfully sent', type: MessageResponseDto })
    @ApiResponse({ status: 403, description: 'Cannot message this user (blocked)' })
    @ApiBody({ type: SendMessageDto })
    async sendMessage(
        @Req() req: any,
        @Body() dto: SendMessageDto
    ): Promise<MessageResponseDto> {
        const message = await this.messageService.sendMessage({
            senderId: req.user.sub,
            receiverId: dto.receiverId,
            content: dto.content
        })
        return message
    }

    // Mark a message as read
    @Post(':id/read')
    @ApiOperation({ summary: 'Mark a message as read' })
    @ApiParam({ name: 'id', description: 'Message ID', example: 'uuid-v4' })
    @ApiResponse({ status: 200, description: 'Message marked as read' })
    @ApiResponse({ status: 404, description: 'Message not found' })
    markAsRead(
        @Req() req: any,
        @Param('id') messageId: string
    ): Promise<{ success: boolean }> {
        return this.messageService.markAsRead(messageId, req.user.sub)
    }

    // Get messages from a conversation
    @Get('conversation/:conversationId')
    @ApiOperation({ summary: 'Get messages for a conversation' })
    @ApiParam({ name: 'conversationId', description: 'Conversation ID', example: 'uuid-v4' })
    @ApiQuery({ name: 'limit', required: false, description: 'Number of messages to return', example: 20 })
    @ApiQuery({ name: 'page', required: false, description: 'Page number', example: 1 })
    @ApiResponse({ status: 200, description: 'List of messages', type: [MessageResponseDto] })
    getMessages(
        @Param('conversationId') conversationId: string,
        @Query() query: GetMessagesQueryDto
    ): Promise<MessageResponseDto[]> {
        const page = query.page || 1
        const limit = query.limit || 20
        return this.messageService.getMessages(conversationId, page, limit)
    }
}