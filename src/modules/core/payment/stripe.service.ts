import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
    readonly stripe: InstanceType<typeof Stripe>;

    constructor() {
        this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
            apiVersion: '2026-04-22.dahlia',
        });
    }
}
