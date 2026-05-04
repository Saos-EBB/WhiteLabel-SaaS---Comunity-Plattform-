import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, MoreThan } from 'typeorm';
import { Subscription } from '../../modules/core/payment/entities/subscription.entity';

@Injectable()
export class PremiumGuard implements CanActivate {
    constructor(
        @InjectRepository(Subscription)
        private readonly subscriptionRepository: Repository<Subscription>,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const userId: string = request['user']?.sub;

        const subscription = await this.subscriptionRepository.findOne({
            where: [
                { user_id: userId, status: 'active', expires_at: IsNull() },
                { user_id: userId, status: 'active', expires_at: MoreThan(new Date()) },
            ],
        });

        if (!subscription) throw new ForbiddenException('Premium-Abo erforderlich.');

        return true;
    }
}
