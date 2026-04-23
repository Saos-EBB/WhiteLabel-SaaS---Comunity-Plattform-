import { User } from '../../auth/entities/user.entity';
export declare class NotificationSettings {
    id: string;
    user_id: string;
    user: User;
    email_messages: boolean;
    email_matches: boolean;
    email_system: boolean;
    push_messages: boolean;
    push_matches: boolean;
    push_system: boolean;
    updated_at: Date | null;
}
