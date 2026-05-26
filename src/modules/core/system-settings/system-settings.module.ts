import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SystemSetting } from './entities/system-setting.entity';
import { SystemSettingsService } from './system-settings.service';
import { SystemSettingsController } from './system-settings.controller';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { OwnerGuard } from '../../../common/guards/owner.guard';

@Module({
    imports: [
        TypeOrmModule.forFeature([SystemSetting]),
        JwtModule.registerAsync({
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => ({
                secret: configService.get<string>('JWT_SECRET'),
                signOptions: { expiresIn: '15m' },
            }),
            inject: [ConfigService],
        }),
    ],
    controllers: [SystemSettingsController],
    providers: [SystemSettingsService, JwtGuard, OwnerGuard],
    exports: [SystemSettingsService],
})
export class SystemSettingsModule {}
