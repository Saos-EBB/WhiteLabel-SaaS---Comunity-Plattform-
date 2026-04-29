import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Profile } from './entities/profile.entity';
import { User } from '../auth/entities/user.entity';
import { Interest } from './entities/interest.entity';
import { UserInterest } from './entities/user-interest.entity';
import { AgbVersion } from './entities/agb-version.entity';
import { ConsentLog } from './entities/consent-log.entity';
import { ProfileSensitiveData } from './entities/profile-sensitive-data.entity';
import { Block } from './entities/block.entity';
import { ProfileService } from './profile.service';
import { ProfileController } from './profile.controller';
import { JwtGuard } from '../../../common/guards/jwt.guard';

@Module({
    imports: [
        TypeOrmModule.forFeature([Profile, User, Interest, UserInterest, AgbVersion, ConsentLog, ProfileSensitiveData, Block]),
        JwtModule.registerAsync({
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => ({
                secret: configService.get<string>('JWT_SECRET'),
                signOptions: { expiresIn: '15m' },
            }),
            inject: [ConfigService],
        }),
    ],
    controllers: [ProfileController],
    providers: [ProfileService, JwtGuard],
})
export class ProfileModule {}
