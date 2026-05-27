import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../core/auth/entities/user.entity';
import { Tooth } from './entities/tooth.entity';
import { ToothChain } from './entities/tooth-chain.entity';

@Injectable()
export class TeethService {
    constructor(
        @InjectRepository(Tooth)
        private readonly toothRepo: Repository<Tooth>,
        @InjectRepository(ToothChain)
        private readonly chainRepo: Repository<ToothChain>,
        @InjectRepository(User)
        private readonly userRepo: Repository<User>,
    ) { }

    async getTeeth(userId: string): Promise<Tooth[]> {
        return this.toothRepo.find({
            where: { owner_id: userId, converted_to_chain: false },
        });
    }

    async getChains(userId: string): Promise<ToothChain[]> {
        return this.chainRepo.find({ where: { user_id: userId } });
    }

    async transform(userId: string): Promise<ToothChain> {
        const teeth = await this.toothRepo.find({
            where: { owner_id: userId, converted_to_chain: false },
            take: 15,
            order: { created_at: 'ASC' },
        });
        if (teeth.length < 15)
            throw new BadRequestException('Nicht genug Zähne (braucht 15)');

        await this.toothRepo.update(
            teeth.map((t) => t.id),
            { converted_to_chain: true },
        );
        return this.chainRepo.save(
            this.chainRepo.create({ user_id: userId }),
        );
    }
}
