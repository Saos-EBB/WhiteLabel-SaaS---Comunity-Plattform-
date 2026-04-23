import { Repository } from 'typeorm';
import { Subscription } from './entities/subscription.entity';
import { PaymentLog } from './entities/payment-log.entity';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
export declare class PaymentService {
    private readonly subscriptionRepository;
    private readonly paymentLogRepository;
    constructor(subscriptionRepository: Repository<Subscription>, paymentLogRepository: Repository<PaymentLog>);
    getActiveSubscription(userId: string): Promise<Subscription | null>;
    createSubscription(userId: string, dto: CreateSubscriptionDto): Promise<Subscription>;
    cancelSubscription(userId: string, subscriptionId: string): Promise<Subscription>;
    getPaymentLogs(userId: string): Promise<PaymentLog[]>;
}
