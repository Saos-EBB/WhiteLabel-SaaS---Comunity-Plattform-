import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserCoinBalance } from './entities/user-coin-balance.entity';
import { CoinTransaction } from './entities/coin-transaction.entity';

@Injectable()
export class CoinService {
    constructor(
        @InjectRepository(UserCoinBalance)
        private readonly balanceRepo: Repository<UserCoinBalance>,
        @InjectRepository(CoinTransaction)
        private readonly txRepo: Repository<CoinTransaction>,
    ) { }

    async getBalance(userId: string): Promise<number> {
        const row = await this.balanceRepo.findOne({ where: { user_id: userId } });
        return row?.balance ?? 0;
    }

    async addCoins(userId: string, amount: number, type: string, beefId?: string): Promise<void> {
        await this.balanceRepo.upsert(
            { user_id: userId, balance: () => `balance + ${amount}` } as any,
            ['user_id'],
        );
        await this.txRepo.save(
            this.txRepo.create({ user_id: userId, amount, type, beef_id: beefId ?? null }),
        );
    }

    async spendCoins(userId: string, amount: number, type: string, beefId?: string): Promise<void> {
        const balance = await this.getBalance(userId);
        if (balance < amount) throw new BadRequestException('Nicht genug Coins');
        await this.balanceRepo.upsert(
            { user_id: userId, balance: () => `balance - ${amount}` } as any,
            ['user_id'],
        );
        await this.txRepo.save(
            this.txRepo.create({ user_id: userId, amount: -amount, type, beef_id: beefId ?? null }),
        );
    }
}
