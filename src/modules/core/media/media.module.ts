import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MediaUpload } from './entities/media-upload.entity';
import { Profile } from '../profile/entities/profile.entity';
import { User } from '../auth/entities/user.entity';
import { MediaService } from './media.service';
import { MediaController } from './media.controller';
import { ModerationModule } from '../moderation/moderation.module';
import { SystemSettingsModule } from '../system-settings/system-settings.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([MediaUpload, Profile, User]),
        JwtModule.registerAsync({
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => ({
                secret: configService.get<string>('JWT_SECRET'),
                signOptions: { expiresIn: '15m' },
            }),
            inject: [ConfigService],
        }),
        ModerationModule,
        SystemSettingsModule,
    ],
    controllers: [MediaController],
    providers: [MediaService],
    exports: [MediaService],
})
export class MediaModule {}
