import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayConnection,
    MessageBody,
    ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Not } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { Conversation } from './entities/conversation.entity';
import { Message, MessageType } from './entities/message.entity';

@WebSocketGateway({ cors: { origin: '*' } })
export class ChatGateway implements OnGatewayConnection {
    @WebSocketServer()
    server!: Server;

    constructor(
        private readonly jwtService: JwtService,
        @InjectRepository(Conversation)
        private readonly conversationRepo: Repository<Conversation>,
        @InjectRepository(Message)
        private readonly messageRepo: Repository<Message>,
    ) {}

    private extractUserId(client: Socket): string | null {
        try {
            const token = (client.handshake.auth?.token ?? client.handshake.query?.token) as string;
const payload = this.jwtService.verify<{ sub: string }>(token);
            return payload.sub;
        } catch {
            return null;
        }
    }

    async handleConnection(client: Socket) {
        const userId = this.extractUserId(client);
if (!userId) {
            client.disconnect();
            return;
        }

        const conversations = await this.conversationRepo.find({
            where: [
                { user_a_id: userId, deleted_at_a: IsNull() },
                { user_b_id: userId, deleted_at_b: IsNull() },
            ],
            select: ['id'],
        });

for (const conv of conversations) {
            client.join(conv.id);
        }
    }

    @SubscribeMessage('join_conversation')
    async handleJoinConversation(
        @ConnectedSocket() client: Socket,
        @MessageBody() conversationId: string,
    ) {
        conversationId = conversationId.replace(/^"|"$/g, '').trim();
        const userId = this.extractUserId(client);
        if (!userId) return;

        const conversation = await this.conversationRepo.findOne({
            where: [
                { id: conversationId, user_a_id: userId, deleted_at_a: IsNull() },
                { id: conversationId, user_b_id: userId, deleted_at_b: IsNull() },
            ],
        });

        if (!conversation) return;
        client.join(conversationId);
    }

    @SubscribeMessage('send_message')
    async handleSendMessage(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { conversationId: string; content?: string; type?: MessageType },
    ) {
        const userId = this.extractUserId(client);
        if (!userId) return;

        const conversation = await this.conversationRepo.findOne({
            where: [
                { id: data.conversationId, user_a_id: userId, deleted_at_a: IsNull() },
                { id: data.conversationId, user_b_id: userId, deleted_at_b: IsNull() },
            ],
        });

        if (!conversation) return;

        const message = await this.messageRepo.save(
            this.messageRepo.create({
                conversation_id: data.conversationId,
                sender_id: userId,
                content: data.content ?? null,
                type: data.type ?? MessageType.TEXT,
            }),
        );

        this.server.to(data.conversationId).emit('new_message', message);
    }

    @SubscribeMessage('typing')
    handleTyping(
        @ConnectedSocket() client: Socket,
        @MessageBody() conversationId: string,
    ) {
        const userId = this.extractUserId(client);
        if (!userId) return;

        client.to(conversationId).emit('user_typing', { userId, conversationId });
    }

    @SubscribeMessage('read_messages')
    async handleReadMessages(
        @ConnectedSocket() client: Socket,
        @MessageBody() conversationId: string,
    ) {
        conversationId = conversationId.replace(/^"|"$/g, '').trim();
        const userId = this.extractUserId(client);
        if (!userId) return;

        const conversation = await this.conversationRepo.findOne({
            where: [
                { id: conversationId, user_a_id: userId, deleted_at_a: IsNull() },
                { id: conversationId, user_b_id: userId, deleted_at_b: IsNull() },
            ],
        });

        if (!conversation) return;

        await this.messageRepo.update(
            { conversation_id: conversationId, sender_id: Not(userId), read_at: IsNull() },
            { read_at: new Date() },
        );

        this.server.to(conversationId).emit('messages_read', { userId, conversationId });
    }
}
