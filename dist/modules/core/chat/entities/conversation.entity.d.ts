import { User } from '../../auth/entities/user.entity';
import { ContactRequest } from './contact-request.entity';
export declare enum ConversationStatus {
    ACTIVE = "active",
    BLOCKED = "blocked",
    ARCHIVED = "archived"
}
export declare class Conversation {
    id: string;
    user_a_id: string;
    user_a: User;
    user_b_id: string;
    user_b: User;
    contact_request_id: string | null;
    contact_request: ContactRequest | null;
    status: string;
    images_enabled: boolean;
    audio_enabled: boolean;
    video_enabled: boolean;
    last_message_at: Date | null;
    created_at: Date;
    deleted_at_a: Date | null;
    deleted_at_b: Date | null;
    purged_at: Date | null;
}
