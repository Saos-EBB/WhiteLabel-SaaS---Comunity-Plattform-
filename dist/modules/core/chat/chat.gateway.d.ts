import { OnGatewayConnection } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { Conversation } from './entities/conversation.entity';
import { Message, MessageType } from './entities/message.entity';
export declare class ChatGateway implements OnGatewayConnection {
    private readonly jwtService;
    private readonly conversationRepo;
    private readonly messageRepo;
    server: Server;
    constructor(jwtService: JwtService, conversationRepo: Repository<Conversation>, messageRepo: Repository<Message>);
    private extractUserId;
    handleConnection(client: Socket): Promise<void>;
    handleJoinConversation(client: Socket, conversationId: string): Promise<void>;
    handleSendMessage(client: Socket, data: {
        conversationId: string;
        content?: string;
        type?: MessageType;
    }): Promise<void>;
    handleTyping(client: Socket, conversationId: string): void;
    handleReadMessages(client: Socket, conversationId: string): Promise<void>;
}
