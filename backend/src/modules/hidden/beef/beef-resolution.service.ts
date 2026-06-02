import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Beef, BeefStatus } from './entities/beef.entity';
import { BeefVote } from './entities/beef-vote.entity';
import { Badge } from '../badge/entities/badge.entity';
import { Tooth } from '../teeth/entities/tooth.entity';
import { User } from '../../core/auth/entities/user.entity';
import { CoinService } from '../coin/coin.service';
import { NotificationsService } from '../../core/notifications/notifications.service';

export interface CoinDistribution {
    totalPool: number;
    winnerShare: number;
    lotteryPerWinner: number;
}

export interface ResolutionResult {
    isTie: boolean;
    winnerId: string | null;
    loserId: string | null;
    coinDistribution: CoinDistribution;
    correctVoters: BeefVote[];
}

@Injectable()
export class BeefResolutionService {
    constructor(
        @InjectRepository(BeefVote)
        private readonly voteRepo: Repository<BeefVote>,
        @InjectRepository(Badge)
        private readonly badgeRepo: Repository<Badge>,
        @InjectRepository(Tooth)
        private readonly toothRepo: Repository<Tooth>,
        private readonly coinService: CoinService,
        private readonly notificationsService: NotificationsService,
        private readonly eventEmitter: EventEmitter2,
        private readonly dataSource: DataSource,
    ) {}

    async resolve(beef: Beef, random: () => number = Math.random): Promise<void> {
        const votes = await this.voteRepo.find({ where: { beef_id: beef.id } });
        const result = this.computeWinner(beef, votes);

        const badgeDurationMs = beef.duration_seconds * 4 * 1000;
        const exile_until = new Date(Date.now() + 24 * 60 * 60 * 1000);

        await this.dataSource.transaction(async (manager) => {
            beef.status = BeefStatus.CLOSED;
            beef.winner_id = result.winnerId;
            await manager.save(beef);

            await manager.update(User, { id: beef.initiator_id }, { exile_until });
            await manager.update(User, { id: beef.target_id },    { exile_until });

            if (result.isTie) {
                const expires_at = new Date(Date.now() + badgeDurationMs);
                await manager.save(this.badgeRepo.create({ user_id: beef.initiator_id, beef_id: beef.id, type: 'loser', expires_at }));
                await manager.save(this.badgeRepo.create({ user_id: beef.target_id,   beef_id: beef.id, type: 'loser', expires_at }));
                await this.notificationsService.notifyBeefLost(beef.initiator_id, beef.id, true);
                await this.notificationsService.notifyBeefLost(beef.target_id,   beef.id, true);
            } else {
                const { winnerId, loserId, coinDistribution, correctVoters } = result;

                if (coinDistribution.totalPool > 0) {
                    if (coinDistribution.winnerShare > 0)
                        await this.coinService.addCoins(winnerId!, coinDistribution.winnerShare, 'earned_win', beef.id, `beef:${beef.id}:winner:${winnerId}`);

                    if (correctVoters.length > 0 && coinDistribution.lotteryPerWinner > 0) {
                        const tickets: string[] = [];
                        for (const v of correctVoters) {
                            for (let i = 0; i < v.coins_wagered; i++) tickets.push(v.voter_id);
                        }
                        const lotteryWinners = new Set<string>();
                        const maxWinners = Math.min(10, correctVoters.length);
                        let attempts = 0;
                        while (lotteryWinners.size < maxWinners && attempts < tickets.length * 3 + 100) {
                            lotteryWinners.add(tickets[Math.floor(random() * tickets.length)]);
                            attempts++;
                        }
                        for (const voterId of lotteryWinners) {
                            await this.coinService.addCoins(voterId, coinDistribution.lotteryPerWinner, 'lottery_win', beef.id, `beef:${beef.id}:lottery:${voterId}`);
                        }
                    }
                }

                const expires_at = new Date(Date.now() + badgeDurationMs);
                await manager.save(this.badgeRepo.create({ user_id: winnerId!, beef_id: beef.id, type: 'winner', expires_at }));
                await manager.save(this.badgeRepo.create({ user_id: loserId!,  beef_id: beef.id, type: 'loser',  expires_at }));
                await manager.save(this.toothRepo.create({ owner_id: winnerId!, from_user_id: loserId!, beef_id: beef.id }));

                await this.notificationsService.notifyBeefWon(winnerId!, beef.id, coinDistribution.winnerShare);
                await this.notificationsService.notifyBeefLost(loserId!, beef.id);
            }
        });

        this.eventEmitter.emit('hidden.beef.closed', { beefId: beef.id, winnerId: result.winnerId });
    }

    private computeWinner(
        beef: Pick<Beef, 'initiator_id' | 'target_id'>,
        votes: BeefVote[],
    ): ResolutionResult {
        let initiatorCoins = 0;
        let targetCoins = 0;
        for (const v of votes) {
            if (v.side === 'initiator') initiatorCoins += v.coins_wagered;
            else targetCoins += v.coins_wagered;
        }

        const totalPool = initiatorCoins + targetCoins;

        if (initiatorCoins === targetCoins) {
            return {
                isTie: true,
                winnerId: null,
                loserId: null,
                coinDistribution: { totalPool, winnerShare: 0, lotteryPerWinner: 0 },
                correctVoters: [],
            };
        }

        const winningSide: 'initiator' | 'target' = initiatorCoins > targetCoins ? 'initiator' : 'target';
        const winnerId = winningSide === 'initiator' ? beef.initiator_id : beef.target_id;
        const loserId  = winningSide === 'initiator' ? beef.target_id   : beef.initiator_id;

        return {
            isTie: false,
            winnerId,
            loserId,
            coinDistribution: {
                totalPool,
                winnerShare: Math.floor(totalPool * 0.40),
                lotteryPerWinner: Math.floor(totalPool * 0.05),
            },
            correctVoters: votes.filter(v => v.side === winningSide),
        };
    }
}
