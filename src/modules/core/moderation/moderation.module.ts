import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ModerationController } from './moderation.controller';
import { ModerationService } from './moderation.service';
import { ProfanityService } from './profanity.service';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Report } from './entities/report.entity';
import { Strike } from './entities/strike.entity';
import { User } from '../auth/entities/user.entity';
import { MediaUpload } from '../media/entities/media-upload.entity';
import { Profile } from '../profile/entities/profile.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { MailModule } from '../../../common/mail/mail.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Report, Strike, User, MediaUpload, Profile]),
        JwtModule.registerAsync({
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => ({
                secret: configService.get<string>('JWT_SECRET'),
                signOptions: { expiresIn: '15m' },
            }),
            inject: [ConfigService],
        }),
        NotificationsModule,
        MailModule,
    ],
    controllers: [ModerationController],
    providers: [ModerationService, ProfanityService, JwtGuard, RolesGuard],
    exports: [ProfanityService],
})
export class ModerationModule { }
