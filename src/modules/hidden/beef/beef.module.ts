import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BeefController } from './beef.controller';
import { BeefService } from './beef.service';
import { BeefScheduler } from './beef.scheduler';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { Beef } from './entities/beef.entity';
import { BeefVote } from './entities/beef-vote.entity';
import { BeefComment } from './entities/beef-comment.entity';
import { User } from '../../core/auth/entities/user.entity';
import { CoinModule } from '../coin/coin.module';
import { BadgeModule } from '../badge/badge.module';
import { TeethModule } from '../teeth/teeth.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Beef, BeefVote, BeefComment, User]),
        JwtModule.registerAsync({
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => ({
                secret: configService.get<string>('JWT_SECRET'),
                signOptions: { expiresIn: '15m' },
            }),
            inject: [ConfigService],
        }),
        CoinModule,
        BadgeModule,
        TeethModule,
    ],
    controllers: [BeefController],
    providers: [BeefService, BeefScheduler, JwtGuard],
    exports: [BeefService],
})
export class BeefModule { }
