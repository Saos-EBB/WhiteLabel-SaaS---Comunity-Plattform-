import { IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateSubscriptionDto {
    @IsEnum(['monthly', 'yearly', 'lifetime'])
    plan!: string;

    @IsEnum(['paypal', 'sepa'])
    payment_provider!: string;

    @IsOptional()
    @IsString()
    provider_subscription_id?: string;
}
