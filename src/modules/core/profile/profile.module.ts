import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Profile } from './entities/profile.entity';
import { ProfileService } from './profile.service';
import { ProfileController } from './profile.controller';
import { JwtGuard } from '../../../common/guards/jwt.guard';

@Module({
    imports: [
        TypeOrmModule.forFeature([Profile]),
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
