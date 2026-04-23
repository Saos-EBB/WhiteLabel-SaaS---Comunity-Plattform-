import {
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Profile } from './entities/profile.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class ProfileService {
    constructor(
        @InjectRepository(Profile)
        private readonly profileRepo: Repository<Profile>,
    ) {}

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

        return this.profileRepo.save(profile);
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
}
