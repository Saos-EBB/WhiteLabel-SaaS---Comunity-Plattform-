import { PaymentService } from './payment.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
export declare class PaymentController {
    private readonly paymentService;
    constructor(paymentService: PaymentService);
    getActiveSubscription(req: any): Promise<import("./entities/subscription.entity").Subscription | null>;
    createSubscription(req: any, dto: CreateSubscriptionDto): Promise<import("./entities/subscription.entity").Subscription>;
    cancelSubscription(req: any, id: string): Promise<import("./entities/subscription.entity").Subscription>;
    getPaymentLogs(req: any): Promise<import("./entities/payment-log.entity").PaymentLog[]>;
}
