import {
    Injectable,
    BadRequestException,
    ConflictException,
    ForbiddenException,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { User } from '../../core/auth/entities/user.entity';
import { Beef, BeefStatus } from './entities/beef.entity';
import { BeefVote } from './entities/beef-vote.entity';
import { BeefComment } from './entities/beef-comment.entity';
import { CreateBeefDto } from './dto/create-beef.dto';
import { RespondBeefDto } from './dto/respond-beef.dto';
import { VoteBeefDto } from './dto/vote-beef.dto';
import { CommentBeefDto } from './dto/comment-beef.dto';
import { CoinService } from '../coin/coin.service';

@Injectable()
export class BeefService {
    constructor(
        @InjectRepository(Beef)
        private readonly beefRepo: Repository<Beef>,
        @InjectRepository(BeefVote)
        private readonly voteRepo: Repository<BeefVote>,
        @InjectRepository(BeefComment)
        private readonly commentRepo: Repository<BeefComment>,
        @InjectRepository(User)
        private readonly userRepo: Repository<User>,
        private readonly coinService: CoinService,
    ) { }

    async create(initiatorId: string, dto: CreateBeefDto): Promise<Beef> {
        if (initiatorId === dto.target_id)
            throw new BadRequestException('Kein Self-Beef erlaubt');
        const target = await this.userRepo.findOne({
            where: { id: dto.target_id, deleted_at: IsNull() },
        });
        if (!target) throw new NotFoundException('User nicht gefunden');

        // Check initiator not in exile
        const initiator = await this.userRepo.findOne({ where: { id: initiatorId } });
        if (initiator?.exile_until && initiator.exile_until > new Date()) {
            throw new BadRequestException(
                `Du bist im Exil bis ${initiator.exile_until.toISOString()}. Verlasse es zuerst.`
            );
        }

        // Check target not in exile
        if (target.exile_until && target.exile_until > new Date()) {
            throw new BadRequestException('Target ist im Exil und kann nicht gebeeft werden.');
        }

        // Check no existing active beef between A-B (either direction)
        const existing = await this.beefRepo
            .createQueryBuilder('b')
            .where(
                `((b.initiator_id = :a AND b.target_id = :b) OR
                  (b.initiator_id = :b AND b.target_id = :a))
                 AND b.status IN ('pending_approval','waiting','active')`,
                { a: initiatorId, b: dto.target_id }
            )
            .getOne();
        if (existing) {
            throw new ConflictException('Es läuft bereits ein Beef zwischen euch.');
        }

        const beef = this.beefRepo.create({
            initiator_id: initiatorId,
            target_id: dto.target_id,
            tldr: dto.tldr,
            chat_passage: dto.chat_passage,
            status: BeefStatus.PENDING_APPROVAL,
        });
        const saved = await this.beefRepo.save(beef);
        await this.coinService.addCoins(initiatorId, 50, 'earned_beef_open', saved.id);
        return saved;
    }

    async getPending(): Promise<any[]> {
        return this.beefRepo
            .createQueryBuilder('b')
            .leftJoin('profiles', 'ip', 'ip.user_id = b.initiator_id')
            .leftJoin('profiles', 'tp', 'tp.user_id = b.target_id')
            .where('b.status = :status', { status: BeefStatus.PENDING_APPROVAL })
            .orderBy('b.created_at', 'ASC')
            .select([
                'b.id AS id',
                'b.initiator_id AS initiator_id',
                'b.target_id AS target_id',
                'b.tldr AS tldr',
                'b.chat_passage AS chat_passage',
                'b.status AS status',
                'b.created_at AS created_at',
                'ip.nickname AS initiator_nickname',
                'tp.nickname AS target_nickname',
            ])
            .getRawMany();
    }

    async respond(beefId: string, userId: string, dto: RespondBeefDto): Promise<Beef> {
        const beef = await this.beefRepo.findOne({ where: { id: beefId } });
        if (!beef) throw new NotFoundException('Beef nicht gefunden');
        if (beef.target_id !== userId) throw new ForbiddenException();
        if (beef.status !== BeefStatus.WAITING)
            throw new BadRequestException('Beef nicht im Waiting-Status');
        if (dto.response === 'chicken') {
            beef.status = BeefStatus.CHICKENED;
            await this.userRepo.increment({ id: userId }, 'chicken_count', 1);
            const exile_until = new Date(Date.now() + 24 * 60 * 60 * 1000);
            await this.userRepo.update({ id: beef.initiator_id }, { exile_until });
            await this.userRepo.update({ id: userId }, { exile_until });
        } else {
            beef.status = BeefStatus.ACTIVE;
            beef.ends_at = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h default
        }
        return this.beefRepo.save(beef);
    }

    async approve(beefId: string): Promise<Beef> {
        const beef = await this.beefRepo.findOne({ where: { id: beefId } });
        if (!beef) throw new NotFoundException();
        if (beef.status !== BeefStatus.PENDING_APPROVAL)
            throw new BadRequestException('Bereits verarbeitet');
        beef.admin_approved = true;
        beef.status = BeefStatus.WAITING;
        return this.beefRepo.save(beef);
    }

    async listActive(): Promise<Beef[]> {
        return this.beefRepo.find({
            where: { status: BeefStatus.ACTIVE },
            order: { created_at: 'DESC' },
            take: 50,
        });
    }

    async listPublic(userId: string): Promise<Beef[]> {
        return this.beefRepo
            .createQueryBuilder('b')
            .where('b.status = :status', { status: BeefStatus.ACTIVE })
            .andWhere('b.initiator_id != :userId AND b.target_id != :userId', { userId })
            .orderBy('b.ends_at', 'ASC')
            .getMany();
    }

    async vote(beefId: string, voterId: string, dto: VoteBeefDto): Promise<BeefVote> {
        const beef = await this.beefRepo.findOne({ where: { id: beefId } });
        if (!beef || beef.status !== BeefStatus.ACTIVE)
            throw new BadRequestException('Beef nicht aktiv');
        const existing = await this.voteRepo.findOne({
            where: { beef_id: beefId, voter_id: voterId },
        });
        if (existing) throw new ConflictException('Bereits gevotet');
        await this.coinService.spendCoins(voterId, dto.coins_wagered, 'spent_vote', beefId);
        const vote = this.voteRepo.create({
            beef_id: beefId,
            voter_id: voterId,
            side: dto.side,
            coins_wagered: dto.coins_wagered,
        });
        return this.voteRepo.save(vote);
    }

    async addComment(beefId: string, userId: string, dto: CommentBeefDto): Promise<BeefComment> {
        const beef = await this.beefRepo.findOne({ where: { id: beefId } });
        if (!beef || beef.status !== BeefStatus.ACTIVE)
            throw new BadRequestException('Beef nicht aktiv');
        const comment = this.commentRepo.create({
            beef_id: beefId,
            user_id: userId,
            content: dto.content,
        });
        const saved = await this.commentRepo.save(comment);
        const count = await this.commentRepo.count({ where: { beef_id: beefId, user_id: userId } });
        if (count <= 3) {
            await this.coinService.addCoins(userId, 5, 'earned_comment', beefId);
        }
        return saved;
    }

    async getComments(beefId: string): Promise<BeefComment[]> {
        return this.commentRepo.find({
            where: { beef_id: beefId },
            order: { created_at: 'ASC' },
        });
    }

    async getVotes(beefId: string): Promise<BeefVote[]> {
        return this.voteRepo.find({ where: { beef_id: beefId } });
    }

    async getIncoming(userId: string): Promise<Beef[]> {
        return this.beefRepo.find({
            where: { target_id: userId, status: BeefStatus.WAITING },
            order: { created_at: 'DESC' },
        });
    }

    async getMyActive(userId: string): Promise<Beef[]> {
        return this.beefRepo.find({
            where: [
                { initiator_id: userId, status: BeefStatus.ACTIVE },
                { target_id: userId, status: BeefStatus.ACTIVE },
            ],
            order: { ends_at: 'ASC' },
        });
    }

    async leaveExile(userId: string): Promise<void> {
        await this.userRepo.update(
            { id: userId },
            { exile_until: null }
        );
    }

    async getExileStatus(userId: string): Promise<{ in_exile: boolean; exile_until: Date | null }> {
        const user = await this.userRepo.findOne({ where: { id: userId } });
        const exile_until = user?.exile_until ?? null;
        const in_exile = exile_until !== null && exile_until > new Date();
        return { in_exile, exile_until };
    }
}
