import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { Profile } from './entities/profile.entity';
import { User } from '../auth/entities/user.entity';
import { Interest } from './entities/interest.entity';
import { UserInterest } from './entities/user-interest.entity';
import { AgbVersion } from './entities/agb-version.entity';
import { ConsentLog } from './entities/consent-log.entity';
import { ProfileSensitiveData } from './entities/profile-sensitive-data.entity';
import { Block } from './entities/block.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { SubmitSensitiveDataDto } from './dto/submit-sensitive-data.dto';

@Injectable()
export class ProfileService {
    constructor(
        @InjectRepository(Profile)
        private readonly profileRepo: Repository<Profile>,
        @InjectRepository(User)
        private readonly userRepo: Repository<User>,
        @InjectRepository(Interest)
        private readonly interestRepo: Repository<Interest>,
        @InjectRepository(UserInterest)
        private readonly userInterestRepo: Repository<UserInterest>,
        @InjectRepository(AgbVersion)
        private readonly agbVersionRepo: Repository<AgbVersion>,
        @InjectRepository(ConsentLog)
        private readonly consentLogRepo: Repository<ConsentLog>,
        @InjectRepository(ProfileSensitiveData)
        private readonly sensitiveDataRepo: Repository<ProfileSensitiveData>,
        @InjectRepository(Block)
        private readonly blockRepo: Repository<Block>,
    ) { }

    private encryptField(value: string): Buffer {
        const key = Buffer.from(process.env.APP_ENCRYPTION_KEY ?? '', 'hex');
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
        const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
        return Buffer.concat([iv, encrypted]);
    }

    async getOwnProfile(userId: string): Promise<Profile> {
        const profile = await this.profileRepo
            .createQueryBuilder('p')
            .innerJoin('p.user', 'u')
            .where('p.user_id = :userId', { userId })
            .andWhere('u.deleted_at IS NULL')
            .getOne();

        if (!profile) throw new NotFoundException('Profil nicht gefunden');
        return profile;
    }

    async updateOwnProfile(userId: string, dto: UpdateProfileDto): Promise<Profile> {
        const profile = await this.getOwnProfile(userId);

        if (dto.nickname !== undefined && dto.nickname !== profile.nickname) {
            const taken = await this.profileRepo.findOne({
                where: { nickname: dto.nickname },
            });
            if (taken) throw new ConflictException('Nickname bereits vergeben');
        }

        if (dto.nickname !== undefined) profile.nickname = dto.nickname;
        if (dto.bio !== undefined) profile.bio = dto.bio;
        if (dto.city !== undefined) profile.city = dto.city;
        if (dto.lang_simple !== undefined) profile.lang_simple = dto.lang_simple;
        if (dto.font_size !== undefined) profile.font_size = dto.font_size;
        if (dto.high_contrast !== undefined) profile.high_contrast = dto.high_contrast;
        if (dto.search_radius_km !== undefined) profile.search_radius_km = dto.search_radius_km;

        const saved = await this.profileRepo.save(profile);
        await this.checkAndCompleteOnboarding(userId);
        return saved;
    }

    private async checkAndCompleteOnboarding(userId: string): Promise<void> {
        const profile = await this.profileRepo.findOne({
            where: { user_id: userId },
            select: ['id', 'nickname', 'birthdate', 'city', 'onboarding_completed'],
        });
        if (!profile || profile.onboarding_completed) return;

        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user?.is_verified) return;

        const [{ count }] = await this.profileRepo.manager.query<[{ count: string }]>(
            'SELECT COUNT(*) AS count FROM user_interests WHERE user_id = $1',
            [userId],
        );

        const interestCount = parseInt(count, 10);
        if (
            profile.nickname &&
            profile.birthdate &&
            profile.city &&
            interestCount >= 1
        ) {
            profile.onboarding_completed = true;
            await this.profileRepo.save(profile);
        }
    }

    async publishProfile(userId: string): Promise<Profile> {
        const profile = await this.getOwnProfile(userId);
        if (!profile.onboarding_completed) {
            throw new BadRequestException('Onboarding nicht abgeschlossen');
        }
        profile.is_published = true;
        return this.profileRepo.save(profile);
    }

    async getInterests(): Promise<Interest[]> {
        return this.interestRepo.find();
    }

    async getUserInterests(userId: string): Promise<UserInterest[]> {
        return this.userInterestRepo.find({
            where: { user_id: userId },
            relations: ['interest'],
        });
    }

    async addInterest(userId: string, interestId: string): Promise<UserInterest[]> {
        const interest = await this.interestRepo.findOne({ where: { id: interestId } });
        if (!interest) throw new NotFoundException('Interesse nicht gefunden');

        const existing = await this.userInterestRepo.findOne({
            where: { user_id: userId, interest_id: interestId },
        });
        if (!existing) {
            const entry = this.userInterestRepo.create({ user_id: userId, interest_id: interestId });
            await this.userInterestRepo.save(entry);
        }

        await this.checkAndCompleteOnboarding(userId);
        return this.getUserInterests(userId);
    }

    async removeInterest(userId: string, interestId: string): Promise<UserInterest[]> {
        await this.userInterestRepo.delete({ user_id: userId, interest_id: interestId });
        return this.getUserInterests(userId);
    }

    async getPublicProfile(nickname: string): Promise<Partial<Profile>> {
        const profile = await this.profileRepo
            .createQueryBuilder('p')
            .innerJoin('p.user', 'u')
            .select(['p.id', 'p.nickname', 'p.bio', 'p.city', 'p.photo_id'])
            .where('p.nickname = :nickname', { nickname })
            .andWhere('p.is_published = true')
            .andWhere('u.deleted_at IS NULL')
            .getOne();

        if (!profile) throw new NotFoundException('Profil nicht gefunden');
        return profile;
    }



    async searchProfiles(requestingUserId: string, city?: string, interestIds?: string[]): Promise<Partial<Profile>[]> {
        const qb = this.profileRepo
            .createQueryBuilder('p')
            .innerJoin('p.user', 'u')
            .select(['p.id', 'p.nickname', 'p.bio', 'p.city', 'p.photo_id'])
            // Nur published, nicht gebannt, nicht gelöscht, nicht der eigene User
            .where('p.is_published = true')
            .andWhere('u.is_banned = false')
            .andWhere('u.deleted_at IS NULL')
            .andWhere('p.user_id != :requestingUserId', { requestingUserId })
            // Blockierte User ausblenden (beide Richtungen)
            .andWhere(`
            NOT EXISTS (
                SELECT 1 FROM blocks b
                WHERE (b.blocker_id = :requestingUserId AND b.blocked_id = p.user_id)
                   OR (b.blocker_id = p.user_id AND b.blocked_id = :requestingUserId)
            )
        `, { requestingUserId });

        if (city) {
            qb.andWhere('LOWER(p.city) LIKE LOWER(:city)', { city: `%${city}%` });
        }

        if (interestIds && interestIds.length > 0) {
            qb.andWhere(`
            EXISTS (
                SELECT 1 FROM user_interests ui
                WHERE ui.user_id = p.user_id
                  AND ui.interest_id = ANY(:interestIds)
            )
        `, { interestIds });
        }

        return qb.getMany();
    }



    async createSensitiveDataConsent(userId: string, ip: string): Promise<Partial<ConsentLog>> {
        const agbVersion = await this.agbVersionRepo.findOne({
            where: { type: 'sensitive_data' as any, is_current: true },
        });
        if (!agbVersion) throw new NotFoundException('Keine aktuelle AGB-Version gefunden');

        const ipHash = crypto.createHash('sha256').update(ip).digest('hex');

        const entry = this.consentLogRepo.create({
            user_id: userId,
            agb_version_id: agbVersion.id,
            accepted: true,
            accepted_at: new Date(),
            ip_hash: ipHash,
        });
        const saved = await this.consentLogRepo.save(entry);

        return { id: saved.id, accepted_at: saved.accepted_at, agb_version_id: saved.agb_version_id };
    }

    async submitSensitiveData(
        userId: string,
        dto: SubmitSensitiveDataDto,
    ): Promise<{ disability_visible: boolean; collected_at: Date }> {
        const consent = await this.consentLogRepo.findOne({
            where: { id: dto.consent_id },
        });
        if (!consent || consent.user_id !== userId || !consent.accepted) {
            throw new ForbiddenException('Ungültige oder fehlende Einwilligung');
        }

        const encryptedType = this.encryptField(dto.disability_type);
        const now = new Date();

        const existing = await this.sensitiveDataRepo.findOne({ where: { user_id: userId } });

        if (existing) {
            existing.consent_id = dto.consent_id;
            existing.disability_type = encryptedType;
            existing.disability_visible = dto.disability_visible;
            existing.updated_at = now;
            await this.sensitiveDataRepo.save(existing);
            return { disability_visible: existing.disability_visible, collected_at: existing.collected_at };
        }

        const entry = this.sensitiveDataRepo.create({
            user_id: userId,
            consent_id: dto.consent_id,
            disability_type: encryptedType,
            disability_visible: dto.disability_visible,
            collected_at: now,
            updated_at: now,
        });
        const saved = await this.sensitiveDataRepo.save(entry);
        return { disability_visible: saved.disability_visible, collected_at: saved.collected_at };
    }


    async blockUser(blockerId: string, blockedId: string): Promise<void> {
        if (blockerId === blockedId) throw new BadRequestException('Du kannst dich nicht selbst blockieren');

        const existing = await this.blockRepo.findOne({ where: { blocker_id: blockerId, blocked_id: blockedId } });
        if (existing) throw new ConflictException('Nutzer bereits blockiert');

        await this.blockRepo.save(this.blockRepo.create({ blocker_id: blockerId, blocked_id: blockedId }));
    }

    async unblockUser(blockerId: string, blockedId: string): Promise<void> {
        const existing = await this.blockRepo.findOne({ where: { blocker_id: blockerId, blocked_id: blockedId } });
        if (!existing) throw new NotFoundException('Blockierung nicht gefunden');

        await this.blockRepo.delete({ id: existing.id });
    }

}//Quack!!
