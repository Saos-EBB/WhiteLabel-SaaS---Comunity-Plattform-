import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MediaUpload } from './entities/media-upload.entity';
import { Profile } from '../profile/entities/profile.entity';
import { MediaService } from './media.service';
import { MediaController } from './media.controller';
import { ModerationModule } from '../moderation/moderation.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([MediaUpload, Profile]),
        JwtModule.registerAsync({
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => ({
                secret: configService.get<string>('JWT_SECRET'),
                signOptions: { expiresIn: '15m' },
            }),
            inject: [ConfigService],
        }),
        ModerationModule,
    ],
    controllers: [MediaController],
    providers: [MediaService],
    exports: [MediaService],
})
export class MediaModule {}
