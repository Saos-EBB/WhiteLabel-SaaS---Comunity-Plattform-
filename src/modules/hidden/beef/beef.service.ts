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
    ) { }

    async create(initiatorId: string, dto: CreateBeefDto): Promise<Beef> {
        if (initiatorId === dto.target_id)
            throw new BadRequestException('Kein Self-Beef erlaubt');
        const target = await this.userRepo.findOne({
            where: { id: dto.target_id, deleted_at: IsNull() },
        });
        if (!target) throw new NotFoundException('User nicht gefunden');
        const beef = this.beefRepo.create({
            initiator_id: initiatorId,
            target_id: dto.target_id,
            tldr: dto.tldr,
            chat_passage: dto.chat_passage,
            status: BeefStatus.PENDING_APPROVAL,
        });
        return this.beefRepo.save(beef);
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

    async vote(beefId: string, voterId: string, dto: VoteBeefDto): Promise<BeefVote> {
        const beef = await this.beefRepo.findOne({ where: { id: beefId } });
        if (!beef || beef.status !== BeefStatus.ACTIVE)
            throw new BadRequestException('Beef nicht aktiv');
        const existing = await this.voteRepo.findOne({
            where: { beef_id: beefId, voter_id: voterId },
        });
        if (existing) throw new ConflictException('Bereits gevotet');
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
        return this.commentRepo.save(comment);
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
}
