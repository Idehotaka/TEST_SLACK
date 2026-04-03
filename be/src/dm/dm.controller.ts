import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Query,
} from '@nestjs/common';
import { DmService } from './dm.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendDmMessageDto } from './dto/send-dm-message.dto';

/**
 * All DM routes are scoped to a workspace so the backend can enforce
 * the "only workspace members can DM each other" rule.
 */
@Controller('workspaces/:workspaceId/dm')
export class DmController {
    constructor(private readonly dmService: DmService) {}

    /**
     * GET /workspaces/:workspaceId/dm/candidates?currentUserId=...
     * Returns workspace members that can be selected as DM targets.
     */
    @Get('candidates')
    getCandidates(
        @Param('workspaceId') workspaceId: string,
        @Query('currentUserId') currentUserId: string,
    ) {
        return this.dmService.getCandidates(workspaceId, currentUserId);
    }

    /**
     * GET /workspaces/:workspaceId/dm/conversations?currentUserId=...
     * Lists all DM conversations for the current user in this workspace.
     */
    @Get('conversations')
    listConversations(
        @Param('workspaceId') workspaceId: string,
        @Query('currentUserId') currentUserId: string,
    ) {
        return this.dmService.listConversations(workspaceId, currentUserId);
    }

    /**
     * POST /workspaces/:workspaceId/dm/conversations
     * Create or retrieve a one-to-one DM conversation.
     */
    @Post('conversations')
    getOrCreate(
        @Param('workspaceId') workspaceId: string,
        @Body() dto: CreateConversationDto,
    ) {
        return this.dmService.getOrCreateConversation(
            workspaceId,
            dto.currentUserId,
            dto.targetUserId,
        );
    }

    /**
     * GET /workspaces/:workspaceId/dm/conversations/:conversationId/messages?currentUserId=...
     */
    @Get('conversations/:conversationId/messages')
    getMessages(
        @Param('conversationId') conversationId: string,
        @Query('currentUserId') currentUserId: string,
    ) {
        return this.dmService.getMessages(conversationId, currentUserId);
    }

    /**
     * POST /workspaces/:workspaceId/dm/conversations/:conversationId/messages
     */
    @Post('conversations/:conversationId/messages')
    sendMessage(
        @Param('conversationId') conversationId: string,
        @Body() dto: SendDmMessageDto,
    ) {
        return this.dmService.sendMessage(conversationId, dto.senderId, dto.content);
    }
}
