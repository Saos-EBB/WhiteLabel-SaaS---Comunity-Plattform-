import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserCoinBalance } from './entities/user-coin-balance.entity';
import { CoinTransaction } from './entities/coin-transaction.entity';

const STARTING_COINS = 100;

@Injectable()
export class CoinService {
    constructor(
        @InjectRepository(UserCoinBalance)
        private readonly balanceRepo: Repository<UserCoinBalance>,
        @InjectRepository(CoinTransaction)
        private readonly txRepo: Repository<CoinTransaction>,
    ) { }

    async ensureBalance(userId: string): Promise<void> {
        const existing = await this.balanceRepo.findOne({ where: { user_id: userId } });
        if (!existing) {
            await this.balanceRepo.save(
                this.balanceRepo.create({ user_id: userId, balance: STARTING_COINS })
            );
            await this.txRepo.save(
                this.txRepo.create({
                    user_id: userId, amount: STARTING_COINS,
                    type: 'starting_bonus', beef_id: null,
                })
            );
        }
    }

    async getBalance(userId: string): Promise<number> {
        await this.ensureBalance(userId);
        const row = await this.balanceRepo.findOne({ where: { user_id: userId } });
        return row?.balance ?? 0;
    }

    async addCoins(userId: string, amount: number, type: string, beefId?: string): Promise<void> {
        await this.ensureBalance(userId);
        await this.balanceRepo.query(
            `INSERT INTO user_coin_balance (user_id, balance)
             VALUES ($1, $2)
             ON CONFLICT (user_id) DO UPDATE
             SET balance = user_coin_balance.balance + $2`,
            [userId, amount]
        );
        await this.txRepo.save(
            this.txRepo.create({ user_id: userId, amount, type, beef_id: beefId ?? null })
        );
    }

    async spendCoins(userId: string, amount: number, type: string, beefId?: string): Promise<void> {
        const balance = await this.getBalance(userId);
        if (balance < amount) throw new BadRequestException('Nicht genug Coins');
        await this.balanceRepo.query(
            `UPDATE user_coin_balance
             SET balance = balance - $1
             WHERE user_id = $2`,
            [amount, userId]
        );
        await this.txRepo.save(
            this.txRepo.create({ user_id: userId, amount: -amount, type, beef_id: beefId ?? null })
        );
    }
}
