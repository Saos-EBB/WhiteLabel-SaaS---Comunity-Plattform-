import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { Notification } from './entities/notification.entity';
import { NotificationSettings } from './entities/notification-settings.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([Notification, NotificationSettings]),
        JwtModule.registerAsync({
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => ({
                secret: configService.get<string>('JWT_SECRET'),
                signOptions: { expiresIn: '15m' },
            }),
            inject: [ConfigService],
        }),
    ],
    controllers: [NotificationsController],
    providers: [NotificationsService, JwtGuard],
    exports: [NotificationsService],
})
export class NotificationsModule { }
