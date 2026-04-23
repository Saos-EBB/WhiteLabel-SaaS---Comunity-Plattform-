import { Repository } from 'typeorm';
import { User } from '../auth/entities/user.entity';
import { ContactRequest } from './entities/contact-request.entity';
import { Conversation } from './entities/conversation.entity';
import { Message, MessageType } from './entities/message.entity';
import { SendContactRequestDto } from './dto/send-contact-request.dto';
import { SendMessageDto } from './dto/send-message.dto';
export declare class ChatService {
    private readonly userRepository;
    private readonly contactRequestRepository;
    private readonly conversationRepository;
    private readonly messageRepository;
    constructor(userRepository: Repository<User>, contactRequestRepository: Repository<ContactRequest>, conversationRepository: Repository<Conversation>, messageRepository: Repository<Message>);
    sendContactRequest(senderId: string, dto: SendContactRequestDto): Promise<ContactRequest>;
    getIncomingRequests(userId: string): Promise<ContactRequest[]>;
    getOutgoingRequests(userId: string): Promise<ContactRequest[]>;
    acceptRequest(userId: string, requestId: string): Promise<Conversation>;
    declineRequest(userId: string, requestId: string): Promise<{
        message: string;
    }>;
    getConversations(userId: string): Promise<Conversation[]>;
    getConversation(userId: string, conversationId: string): Promise<Conversation>;
    getMessages(userId: string, conversationId: string): Promise<{
        content: string | null;
        id: string;
        conversation_id: string;
        conversation: Conversation;
        sender_id: string;
        sender: User;
        type: MessageType;
        media_id: string | null;
        is_deleted: boolean;
        deleted_at: Date | null;
        flagged: boolean;
        flagged_by: string | null;
        flagged_at: Date | null;
        read_at: Date | null;
        purged_at: Date | null;
        sent_at: Date;
    }[]>;
    sendMessage(userId: string, conversationId: string, dto: SendMessageDto): Promise<Message>;
    deleteMessage(userId: string, messageId: string): Promise<{
        message: string;
    }>;
    private verifyConversationAccess;
}
