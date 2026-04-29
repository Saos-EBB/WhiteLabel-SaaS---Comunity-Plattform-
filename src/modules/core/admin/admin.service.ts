import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../auth/entities/user.entity';

@Injectable()
export class AdminService {
    constructor(
        @InjectRepository(User)
        private readonly userRepo: Repository<User>,
    ) {}

    async setVulnerableFlag(userId: string, flag: boolean): Promise<Partial<User>> {
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user) throw new NotFoundException('Benutzer nicht gefunden');

        user.vulnerable_flag = flag;
        await this.userRepo.save(user);

        const { password_hash, google_id_hash, email_search_hash, email, email_verification_token, password_reset_token, ...safe } = user;
        return safe;
    }
}
