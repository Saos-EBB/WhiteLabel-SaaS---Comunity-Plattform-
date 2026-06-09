import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DiscoverController } from './discover.controller';
import { MatchingService } from './matching.service';
import { SwipeService } from './swipe.service';
import { Swipe } from './entities/swipe.entity';
import { Match } from './entities/match.entity';
import { Conversation } from '../chat/entities/conversation.entity';
import { Profile } from '../profile/entities/profile.entity';
import { Subscription } from '../payment/entities/subscription.entity';
import { JwtGuard } from '../../../common/guards/jwt.guard';

@Module({
    imports: [
        TypeOrmModule.forFeature([Swipe, Match, Conversation, Profile, Subscription]),
        JwtModule.registerAsync({
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => ({
                secret: configService.get<string>('JWT_SECRET'),
                signOptions: { expiresIn: '15m' },
            }),
            inject: [ConfigService],
        }),
    ],
    controllers: [DiscoverController],
    providers: [MatchingService, SwipeService, JwtGuard],
})
export class MatchingModule {}
