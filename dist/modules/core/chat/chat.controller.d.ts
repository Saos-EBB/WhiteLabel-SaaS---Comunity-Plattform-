import { ChatService } from './chat.service';
import { SendContactRequestDto } from './dto/send-contact-request.dto';
import { SendMessageDto } from './dto/send-message.dto';
export declare class ChatController {
    private readonly chatService;
    constructor(chatService: ChatService);
    sendContactRequest(req: any, dto: SendContactRequestDto): Promise<import("./entities/contact-request.entity").ContactRequest>;
    was: any;
    getIncomingRequests(req: any): Promise<import("./entities/contact-request.entity").ContactRequest[]>;
    getOutgoingRequests(req: any): Promise<import("./entities/contact-request.entity").ContactRequest[]>;
    acceptRequest(req: any, id: string): Promise<import("./entities/conversation.entity").Conversation>;
    declineRequest(req: any, id: string): Promise<{
        message: string;
    }>;
    getConversations(req: any): Promise<import("./entities/conversation.entity").Conversation[]>;
    getConversation(req: any, id: string): Promise<import("./entities/conversation.entity").Conversation>;
    getMessages(req: any, id: string): Promise<{
        content: string | null;
        id: string;
        conversation_id: string;
        conversation: import("./entities/conversation.entity").Conversation;
        sender_id: string;
        sender: import("../auth/entities/user.entity").User;
        type: import("./entities/message.entity").MessageType;
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
    sendMessage(req: any, id: string, dto: SendMessageDto): Promise<import("./entities/message.entity").Message>;
    deleteMessage(req: any, id: string): Promise<{
        message: string;
    }>;
}
