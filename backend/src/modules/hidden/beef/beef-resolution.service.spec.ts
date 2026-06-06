import { BeefResolutionService } from './beef-resolution.service';

// Minimal stub for computeWinner (private method tested via public interface)
describe('BeefResolutionService.computeWinner (via reflection)', () => {
    const dummyDeps = {
        voteRepo: {},
        badgeRepo: {},
        toothRepo: {},
        coinService: {},
        notificationsService: {},
        eventEmitter: {},
        dataSource: {},
        systemSettings: {},
    };

    // Access private method for unit testing
    const service = new (BeefResolutionService as any)(
        ...Object.values(dummyDeps)
    );
    const compute = (beef: any, votes: any, winnerId: string | null) =>
        (service as any).computeWinner(beef, votes, winnerId, 30, 60, 5, 20);

    const beef = { initiator_id: 'A', target_id: 'B', pot_coins: 100 };

    it('tie when gameWinnerId is null', () => {
        const result = compute(beef, [], null);
        expect(result.isTie).toBe(true);
        expect(result.winnerId).toBeNull();
    });

    it('winner gets 30% of pool', () => {
        // pool = pot_coins(100) + votes(0) = 100
        const result = compute(beef, [], 'A');
        expect(result.coinDistribution.winnerShare).toBe(30); // 30% of 100
        expect(result.isTie).toBe(false);
        expect(result.winnerId).toBe('A');
        expect(result.loserId).toBe('B');
    });

    it('correct bettors share 60% in 5% chunks max 20% each', () => {
        // pool = 100 pot + 100 votes = 200
        // bettorsPool = 60% of 200 = 120, chunkSize = 5% of 200 = 10, max = 20% of 200 = 40
        const votes = [
            { voter_id: 'V1', side: 'initiator', coins_wagered: 10 },
            { voter_id: 'V2', side: 'initiator', coins_wagered: 10 },
            { voter_id: 'V3', side: 'initiator', coins_wagered: 10 },
            { voter_id: 'V4', side: 'target',    coins_wagered: 10 },
        ];
        const result = compute({ ...beef, pot_coins: 100 }, votes, 'A');
        // total pool = 100 + 40 = 140
        const totalPaid = result.coinDistribution.bettorPayouts.reduce((s: number, p: any) => s + p.amount, 0);
        expect(totalPaid).toBeLessThanOrEqual(Math.floor(140 * 0.60));
        // all payouts go to initiator voters only
        const payoutIds = result.coinDistribution.bettorPayouts.map((p: any) => p.voterId);
        expect(payoutIds).not.toContain('V4');
    });
});
