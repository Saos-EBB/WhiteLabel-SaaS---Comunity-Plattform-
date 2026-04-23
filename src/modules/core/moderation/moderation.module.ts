import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ModerationController } from './moderation.controller';
import { ModerationService } from './moderation.service';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { Report } from './entities/report.entity';
import { Strike } from './entities/strike.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([Report, Strike]),
        JwtModule.registerAsync({
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => ({
                secret: configService.get<string>('JWT_SECRET'),
                signOptions: { expiresIn: '15m' },
            }),
            inject: [ConfigService],
        }),
    ],
    controllers: [ModerationController],
    providers: [ModerationService, JwtGuard],
})
export class ModerationModule { }
