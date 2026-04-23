import { User } from '../../auth/entities/user.entity';
import { Conversation } from './conversation.entity';
export declare enum MessageType {
    TEXT = "text",
    IMAGE = "image",
    AUDIO = "audio"
}
export declare class Message {
    id: string;
    conversation_id: string;
    conversation: Conversation;
    sender_id: string;
    sender: User;
    content: string | null;
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
}
