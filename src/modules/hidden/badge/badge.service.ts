import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Badge } from './entities/badge.entity';

@Injectable()
export class BadgeService {
    constructor(
        @InjectRepository(Badge)
        private readonly badgeRepo: Repository<Badge>,
    ) { }

    async getActiveBadges(userId: string): Promise<Badge[]> {
        return this.badgeRepo
            .createQueryBuilder('b')
            .where('b.user_id = :userId', { userId })
            .andWhere('b.expires_at > NOW()')
            .orderBy('b.created_at', 'DESC')
            .getMany();
    }

    async createBadge(userId: string, beefId: string, type: string, durationMs: number): Promise<Badge> {
        const expires_at = new Date(Date.now() + durationMs);
        return this.badgeRepo.save(
            this.badgeRepo.create({ user_id: userId, beef_id: beefId, type, expires_at }),
        );
    }
}
