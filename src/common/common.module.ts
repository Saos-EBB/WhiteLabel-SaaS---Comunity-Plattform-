import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Subscription } from '../modules/core/payment/entities/subscription.entity';
import { PremiumGuard } from './guards/premium.guard';

@Module({
    imports: [TypeOrmModule.forFeature([Subscription])],
    providers: [PremiumGuard],
    exports: [PremiumGuard],
})
export class CommonModule { }
