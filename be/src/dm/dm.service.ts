import {
    Injectable,
    BadRequestException,
    NotFoundException,
    ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { DmConversation } from './entities/dm-conversation.entity';
import { DmParticipant } from './entities/dm-participant.entity';
import { DmMessage } from './entities/dm-message.entity';
import { Workspace } from 'src/workspace/entities/workspace.entity';
import { User } from 'src/user/entities/user.entity';

@Injectable()
export class DmService {
    constructor(
        @InjectRepository(DmConversation)
        private conversationRepo: Repository<DmConversation>,
        @InjectRepository(DmParticipant)
        private participantRepo: Repository<DmParticipant>,
        @InjectRepository(DmMessage)
        private messageRepo: Repository<DmMessage>,
        @InjectRepository(Workspace)
        private workspaceRepo: Repository<Workspace>,
        @InjectRepository(User)
        private userRepo: Repository<User>,
        private dataSource: DataSource,
    ) {}

    /**
     * Returns workspace members that can be selected as DM targets.
     * Excludes the requesting user from the list.
     */
    async getCandidates(workspaceId: string, currentUserId: string) {
        const workspace = await this.workspaceRepo.findOne({
            where: { id: workspaceId },
            relations: ['members'],
        });
        if (!workspace) throw new NotFoundException('Workspace not found');

        const isMember = workspace.members.some((m) => m.id === currentUserId);
        if (!isMember) throw new ForbiddenException('Not a member of this workspace');

        return workspace.members
            .filter((m) => m.id !== currentUserId)
            .map((m) => ({
                id: m.id,
                dispname: m.dispname,
                email: m.email,
                avatar: m.avatar,
            }));
    }

    /**
     * Create or retrieve a one-to-one DM conversation between two workspace members.
     * Enforces: both users must be workspace members, no duplicate conversations.
     */
    async getOrCreateConversation(
        workspaceId: string,
        currentUserId: string,
        targetUserId: string,
    ) {
        if (currentUserId === targetUserId) {
            throw new BadRequestException('Cannot create a DM with yourself');
        }

        // Validate both users are workspace members
        const workspace = await this.workspaceRepo.findOne({
            where: { id: workspaceId },
            relations: ['members'],
        });
        if (!workspace) throw new NotFoundException('Workspace not found');

        const memberIds = workspace.members.map((m) => m.id);
        if (!memberIds.includes(currentUserId)) {
            throw new ForbiddenException('Current user is not a workspace member');
        }
        if (!memberIds.includes(targetUserId)) {
            throw new ForbiddenException('Target user is not a workspace member');
        }

        // Look for an existing conversation between these two users in this workspace
        const existing = await this.dataSource
            .createQueryBuilder(DmConversation, 'conv')
            .innerJoin('conv.participants', 'p1', 'p1.userId = :uid1', { uid1: currentUserId })
            .innerJoin('conv.participants', 'p2', 'p2.userId = :uid2', { uid2: targetUserId })
            .where('conv.workspaceId = :workspaceId', { workspaceId })
            .getOne();

        if (existing) {
            return this.formatConversation(existing, currentUserId);
        }

        // Create new conversation with both participants in a transaction
        const conversation = await this.dataSource.transaction(async (manager) => {
            const conv = manager.create(DmConversation, { workspaceId });
            const saved = await manager.save(conv);

            await manager.save(
                manager.create(DmParticipant, { conversationId: saved.id, userId: currentUserId }),
            );
            await manager.save(
                manager.create(DmParticipant, { conversationId: saved.id, userId: targetUserId }),
            );

            return saved;
        });

        return this.formatConversation(conversation, currentUserId);
    }

    /**
     * List all DM conversations for the current user in a workspace,
     * ordered by most recent activity.
     */
    async listConversations(workspaceId: string, currentUserId: string) {
        const participants = await this.participantRepo.find({
            where: { userId: currentUserId },
            relations: ['conversation', 'conversation.participants', 'conversation.participants.user'],
        });

        const conversations = participants
            .map((p) => p.conversation)
            .filter((c) => c.workspaceId === workspaceId);

        // Fetch latest message for each conversation
        const result = await Promise.all(
            conversations.map(async (conv) => {
                const latestMessage = await this.messageRepo.findOne({
                    where: { conversationId: conv.id },
                    order: { createdAt: 'DESC' },
                    relations: ['sender'],
                });

                const otherParticipant = conv.participants.find(
                    (p) => p.userId !== currentUserId,
                );

                return {
                    id: conv.id,
                    otherUser: otherParticipant
                        ? {
                              id: otherParticipant.user.id,
                              dispname: otherParticipant.user.dispname,
                              email: otherParticipant.user.email,
                              avatar: otherParticipant.user.avatar,
                          }
                        : null,
                    latestMessage: latestMessage
                        ? {
                              id: latestMessage.id,
                              content: latestMessage.content,
                              createdAt: latestMessage.createdAt,
                              senderId: latestMessage.senderId,
                          }
                        : null,
                    updatedAt: conv.updatedAt,
                    lastMessageAt: conv.lastMessageAt,
                };
            }),
        );

        // Sort by most recent activity
        return result.sort((a, b) => {
            const aTime = a.lastMessageAt ?? a.updatedAt;
            const bTime = b.lastMessageAt ?? b.updatedAt;
            return new Date(bTime).getTime() - new Date(aTime).getTime();
        });
    }

    /**
     * Fetch messages for a DM conversation.
     * Validates the requesting user is a participant.
     */
    async getMessages(conversationId: string, currentUserId: string) {
        await this.assertParticipant(conversationId, currentUserId);

        return this.messageRepo.find({
            where: { conversationId },
            order: { createdAt: 'ASC' },
            relations: ['sender'],
        });
    }

    /**
     * Send a DM message.
     * Validates the sender is a participant.
     */
    async sendMessage(
        conversationId: string,
        senderId: string,
        content: string,
    ) {
        if (!content?.trim()) throw new BadRequestException('Content cannot be empty');

        await this.assertParticipant(conversationId, senderId);

        const message = this.messageRepo.create({ conversationId, senderId, content });
        const saved = await this.messageRepo.save(message);

        // Update conversation lastMessageAt
        await this.conversationRepo.update(conversationId, { lastMessageAt: new Date() });

        // Return with sender populated
        return this.messageRepo.findOne({
            where: { id: saved.id },
            relations: ['sender'],
        });
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private async assertParticipant(conversationId: string, userId: string) {
        const participant = await this.participantRepo.findOne({
            where: { conversationId, userId },
        });
        if (!participant) {
            throw new ForbiddenException('Not a participant in this conversation');
        }
    }

    private formatConversation(conv: DmConversation, currentUserId: string) {
        return {
            id: conv.id,
            workspaceId: conv.workspaceId,
            createdAt: conv.createdAt,
            updatedAt: conv.updatedAt,
        };
    }
}
