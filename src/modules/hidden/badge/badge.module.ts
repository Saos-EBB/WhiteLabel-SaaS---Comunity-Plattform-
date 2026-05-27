import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BadgeService } from './badge.service';
import { Badge } from './entities/badge.entity';
import { User } from '../../core/auth/entities/user.entity';
import { Beef } from '../beef/entities/beef.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([Badge, User, Beef]),
    ],
    providers: [BadgeService],
    exports: [BadgeService],
})
export class BadgeModule { }
