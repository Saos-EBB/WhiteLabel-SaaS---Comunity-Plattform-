import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Beef, BeefStatus } from './entities/beef.entity';
import { BeefService } from './beef.service';

@Injectable()
export class BeefScheduler {
    constructor(
        @InjectRepository(Beef)
        private readonly beefRepo: Repository<Beef>,
        private readonly beefService: BeefService,
    ) {}

    @Cron(CronExpression.EVERY_MINUTE)
    async closeExpiredBeefs(): Promise<void> {
        const expired = await this.beefRepo.find({
            where: {
                status: BeefStatus.ACTIVE,
                ends_at: LessThan(new Date()),
            },
        });
        for (const beef of expired) {
            await this.beefService.closeBeef(beef.id);
        }
    }

    @Cron(CronExpression.EVERY_5_MINUTES)
    async autoChickenExpired(): Promise<void> {
        const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const waiting = await this.beefRepo.find({
            where: {
                status: BeefStatus.WAITING,
                created_at: LessThan(cutoff),
            },
        });
        for (const beef of waiting) {
            await this.beefService.chickenBeef(beef.id, 'timeout');
        }
    }
}
