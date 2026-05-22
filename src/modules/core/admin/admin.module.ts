import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { User } from '../auth/entities/user.entity';
import { MediaUpload } from '../media/entities/media-upload.entity';
import { Report } from '../moderation/entities/report.entity';
import { Strike } from '../moderation/entities/strike.entity';
import { Profile } from '../profile/entities/profile.entity';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { PseudonymizationTask } from './tasks/pseudonymization.task';
import { NotificationsModule } from '../notifications/notifications.module';
import { ModerationModule } from '../moderation/moderation.module';
import { MailModule } from '../../../common/mail/mail.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([User, MediaUpload, Report, Strike, Profile]),
        JwtModule.registerAsync({
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => ({
                secret: configService.get<string>('JWT_SECRET'),
                signOptions: { expiresIn: '15m' },
            }),
            inject: [ConfigService],
        }),
        NotificationsModule,
        ModerationModule,
        MailModule,
    ],
    controllers: [AdminController],
    providers: [AdminService, JwtGuard, RolesGuard, PseudonymizationTask],
})
export class AdminModule {}
