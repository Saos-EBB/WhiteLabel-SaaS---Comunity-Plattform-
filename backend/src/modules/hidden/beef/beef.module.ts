import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BeefController } from './beef.controller';
import { BeefService } from './beef.service';
import { BeefResolutionService } from './beef-resolution.service';
import { BeefStateMachineService } from './beef-state-machine.service';
import { BeefScheduler } from './beef.scheduler';
import { HiddenBeefGateway } from './beef.gateway';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { Beef } from './entities/beef.entity';
import { BeefVote } from './entities/beef-vote.entity';
import { BeefComment } from './entities/beef-comment.entity';
import { User } from '../../core/auth/entities/user.entity';
import { Badge } from '../badge/entities/badge.entity';
import { Tooth } from '../teeth/entities/tooth.entity';
import { CoinModule } from '../coin/coin.module';
import { NotificationsModule } from '../../core/notifications/notifications.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Beef, BeefVote, BeefComment, User, Badge, Tooth]),
        JwtModule.registerAsync({
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => ({
                secret: configService.get<string>('JWT_SECRET'),
                signOptions: { expiresIn: '15m' },
            }),
            inject: [ConfigService],
        }),
        CoinModule,
        NotificationsModule,
    ],
    controllers: [BeefController],
    providers: [BeefService, BeefResolutionService, BeefStateMachineService, BeefScheduler, JwtGuard, HiddenBeefGateway],
    exports: [BeefService],
})
export class BeefModule { }
