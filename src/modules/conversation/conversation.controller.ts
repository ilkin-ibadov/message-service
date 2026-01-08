import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger'
import { ConversationService } from './conversation.service'
import { Conversation } from './conversation.entity'
import { JwtAuthGuard } from '../../middlewares/auth.guard'

@ApiTags('Conversations')
@UseGuards(JwtAuthGuard)
@Controller('conversations')
export class ConversationController {
    constructor(private readonly conversationService: ConversationService) { }

    @Get()
    @ApiOperation({ summary: 'Get my conversations' })
    @ApiResponse({ status: 200, type: [Conversation] })
    async getMyConversations(
        @Req() req: any,
    ): Promise<Conversation[]> {
        return this.conversationService.getUserConversations(req.user.sub)
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get conversation by ID' })
    @ApiParam({ name: 'id', example: 'uuid-v4' })
    @ApiResponse({ status: 200, type: Conversation })
    async getConversation(
        @Param('id') id: string,
    ): Promise<Conversation | null> {
        return this.conversationService.getConversationById(id)
    }
}
