import { User } from '../../auth/entities/user.entity';
import { Interest } from './interest.entity';
export declare class UserInterest {
    id: string;
    user_id: string;
    user: User;
    interest_id: string;
    interest: Interest;
    created_at: Date;
}
