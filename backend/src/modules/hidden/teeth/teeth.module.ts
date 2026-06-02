import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TeethController } from './teeth.controller';
import { TeethService } from './teeth.service';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { Tooth } from './entities/tooth.entity';
import { ToothChain } from './entities/tooth-chain.entity';
import { User } from '../../core/auth/entities/user.entity';
import { Beef } from '../beef/entities/beef.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([Tooth, ToothChain, User, Beef]),
        JwtModule.registerAsync({
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => ({
                secret: configService.get<string>('JWT_SECRET'),
                signOptions: { expiresIn: '15m' },
            }),
            inject: [ConfigService],
        }),
    ],
    controllers: [TeethController],
    providers: [TeethService, JwtGuard],
    exports: [TeethService],
})
export class TeethModule { }
