import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../auth/entities/user.entity';
import { Profile } from '../profile/entities/profile.entity';
import { SetupService } from './setup.service';
import { SetupController } from './setup.controller';

@Module({
    imports: [TypeOrmModule.forFeature([User, Profile])],
    controllers: [SetupController],
    providers: [SetupService],
})
export class SetupModule {}
