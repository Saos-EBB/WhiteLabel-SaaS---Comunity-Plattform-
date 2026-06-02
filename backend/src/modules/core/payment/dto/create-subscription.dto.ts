import { IsEnum } from 'class-validator';

export class CreateSubscriptionDto {
    @IsEnum(['monthly', 'yearly', 'lifetime'])
    plan!: 'monthly' | 'yearly' | 'lifetime';

    @IsEnum(['card', 'sepa_debit'])
    payment_method!: 'card' | 'sepa_debit';
}
