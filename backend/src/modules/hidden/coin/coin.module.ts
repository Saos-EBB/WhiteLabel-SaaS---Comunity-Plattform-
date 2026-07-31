import { Module, Type } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CoinController } from './coin.controller';
import { CoinTestPurchaseController } from './coin-test-purchase.controller';
import { CoinService } from './coin.service';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { UserCoinBalance } from './entities/user-coin-balance.entity';
import { CoinTransaction } from './entities/coin-transaction.entity';
import { User } from '../../core/auth/entities/user.entity';

// CoinTestPurchaseController wird NUR gemountet wenn LOADTEST_MODE=true gesetzt ist.
// Ausserhalb davon existiert die Route /hidden/coin/test-purchase nicht (404) —
// bewusst kein reiner if-Check im Controller, sondern gar nicht erst registriert.
const controllers: Type<any>[] = [CoinController];
if (process.env.LOADTEST_MODE === 'true') {
    controllers.push(CoinTestPurchaseController);
}

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
        ConfigModule,
    ],
    controllers,
    providers: [CoinService, JwtGuard],
    exports: [CoinService],
})
export class CoinModule { }
