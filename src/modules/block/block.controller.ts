import { Controller, Post, Delete, Get, Req, Param, UseGuards } from '@nestjs/common'
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiParam,
} from '@nestjs/swagger'
import { BlockService } from './block.service'
import { JwtAuthGuard } from '../../middlewares/auth.guard'
import { UserBlock } from './block.entity'

@ApiTags('Blocks')
@UseGuards(JwtAuthGuard)
@Controller('blocks')
export class BlockController {
    constructor(private readonly blockService: BlockService) { }

    @Post(':userId')
    @ApiOperation({ summary: 'Block a user' })
    @ApiParam({ name: 'userId', example: 'uuid-v4' })
    @ApiResponse({ status: 201, description: 'User blocked' })
    async blockUser(
        @Req() req: any,
        @Param('userId') blockedId: string,
    ) {
        await this.blockService.blockUser(req.user.sub, blockedId)
        return { success: true }
    }

    @Delete(':userId')
    @ApiOperation({ summary: 'Unblock a user' })
    @ApiParam({ name: 'userId', example: 'uuid-v4' })
    @ApiResponse({ status: 200, description: 'User unblocked' })
    async unblockUser(
        @Req() req: any,
        @Param('userId') blockedId: string,
    ) {
        await this.blockService.unblockUser(req.user.sub, blockedId)
        return { success: true }
    }

    @Get()
    @ApiOperation({ summary: 'Get blocked users' })
    @ApiResponse({ status: 200, type: [UserBlock] })
    async getBlockedUsers(
        @Req() req: any,
    ): Promise<UserBlock[]> {
        return this.blockService.getBlockedUsers(req.user.sub)
    }
}
