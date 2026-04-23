import { User } from '../../auth/entities/user.entity';
export declare class Subscription {
    id: string;
    user_id: string;
    user: User;
    plan: string;
    status: string;
    payment_provider: string;
    provider_subscription_id: string | null;
    started_at: Date;
    expires_at: Date | null;
    cancelled_at: Date | null;
}
