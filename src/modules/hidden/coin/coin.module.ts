import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CoinController } from './coin.controller';
import { CoinService } from './coin.service';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { UserCoinBalance } from './entities/user-coin-balance.entity';
import { CoinTransaction } from './entities/coin-transaction.entity';
import { User } from '../../core/auth/entities/user.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([UserCoinBalance, CoinTransaction, User]),
        JwtModule.registerAsync({
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => ({
                secret: configService.get<string>('JWT_SECRET'),
                signOptions: { expiresIn: '15m' },
            }),
            inject: [ConfigService],
        }),
    ],
    controllers: [CoinController],
    providers: [CoinService, JwtGuard],
    exports: [CoinService],
})
export class CoinModule { }
