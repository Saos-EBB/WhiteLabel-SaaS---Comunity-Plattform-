import { User } from '../../auth/entities/user.entity';
export declare class Block {
    id: string;
    blocker_id: string;
    blocked_id: string;
    blocker: User;
    blocked: User;
    created_at: Date;
}
