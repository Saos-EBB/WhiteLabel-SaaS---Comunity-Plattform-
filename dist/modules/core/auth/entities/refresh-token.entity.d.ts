import { User } from './user.entity';
export declare class RefreshToken {
    id: string;
    user: User;
    user_id: string;
    token_hash: string;
    device_info: string | null;
    is_revoked: boolean;
    expires_at: Date;
    created_at: Date;
}
