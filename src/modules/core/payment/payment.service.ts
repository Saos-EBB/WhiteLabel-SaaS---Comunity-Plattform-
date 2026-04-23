import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscription } from './entities/subscription.entity';
import { PaymentLog } from './entities/payment-log.entity';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';

@Injectable()
export class PaymentService {
    constructor(
        @InjectRepository(Subscription)
        private readonly subscriptionRepository: Repository<Subscription>,
        @InjectRepository(PaymentLog)
        private readonly paymentLogRepository: Repository<PaymentLog>,
    ) { }

    async getActiveSubscription(userId: string) {
        return this.subscriptionRepository.findOne({
            where: { user_id: userId, status: 'active' },
        });
    }

    async createSubscription(userId: string, dto: CreateSubscriptionDto) {
        const subscription = this.subscriptionRepository.create({
            user_id: userId,
            plan: dto.plan,
            status: 'active',
            payment_provider: dto.payment_provider,
            provider_subscription_id: dto.provider_subscription_id ?? null,
            started_at: new Date(),
        });

        return this.subscriptionRepository.save(subscription);
    }

    async cancelSubscription(userId: string, subscriptionId: string) {
        const subscription = await this.subscriptionRepository.findOne({
            where: { id: subscriptionId },
        });

        if (!subscription) throw new NotFoundException('Abonnement nicht gefunden');
        if (subscription.user_id !== userId) throw new ForbiddenException('Keine Berechtigung');

        subscription.status = 'cancelled';
        subscription.cancelled_at = new Date();

        return this.subscriptionRepository.save(subscription);
    }

    async getPaymentLogs(userId: string) {
        return this.paymentLogRepository.find({
            where: { user_id: userId },
            order: { created_at: 'DESC' },
        });
    }
}
