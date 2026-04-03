import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { DmService } from './dm.service';

@WebSocketGateway({ cors: true })
export class DmGateway {
    @WebSocketServer()
    server: Server;

    constructor(private readonly dmService: DmService) {}

    /** Client joins a DM conversation room to receive real-time messages */
    @SubscribeMessage('join_dm')
    handleJoinDm(client: Socket, conversationId: string) {
        client.join(`dm:${conversationId}`);
    }

    @SubscribeMessage('leave_dm')
    handleLeaveDm(client: Socket, conversationId: string) {
        client.leave(`dm:${conversationId}`);
    }

    /**
     * Send a DM message via socket.
     * Payload: { conversationId, senderId, content }
     * Broadcasts new_dm_message to all clients in the conversation room.
     */
    @SubscribeMessage('send_dm_message')
    async handleDmMessage(@MessageBody() payload: {
        conversationId: string;
        senderId: string;
        content: string;
    }) {
        const message = await this.dmService.sendMessage(
            payload.conversationId,
            payload.senderId,
            payload.content,
        );

        this.server
            .to(`dm:${payload.conversationId}`)
            .emit('new_dm_message', message);

        return message;
    }
}
