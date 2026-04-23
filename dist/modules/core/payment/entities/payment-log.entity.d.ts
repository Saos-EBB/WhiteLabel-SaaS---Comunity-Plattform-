import { User } from '../../auth/entities/user.entity';
export declare class PaymentLog {
    id: string;
    user_id: string;
    user: User;
    subscription_id: string | null;
    amount: number;
    tax_amount: number | null;
    currency: string;
    status: string;
    provider_tx_id: string | null;
    created_at: Date;
}
