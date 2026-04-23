import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { Subscription } from './entities/subscription.entity';
import { PaymentLog } from './entities/payment-log.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([Subscription, PaymentLog]),
        JwtModule.registerAsync({
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => ({
                secret: configService.get<string>('JWT_SECRET'),
                signOptions: { expiresIn: '15m' },
            }),
            inject: [ConfigService],
        }),
    ],
    controllers: [PaymentController],
    providers: [PaymentService, JwtGuard],
})
export class PaymentModule { }
