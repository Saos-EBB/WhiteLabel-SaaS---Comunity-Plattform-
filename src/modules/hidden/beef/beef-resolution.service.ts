import { Injectable } from '@nestjs/common';
import { Beef } from './entities/beef.entity';
import { BeefVote } from './entities/beef-vote.entity';

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
    resolve(
        beef: Pick<Beef, 'initiator_id' | 'target_id'>,
        votes: BeefVote[],
        _random: () => number = Math.random,
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
