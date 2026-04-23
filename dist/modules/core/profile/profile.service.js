"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProfileService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const profile_entity_1 = require("./entities/profile.entity");
let ProfileService = class ProfileService {
    profileRepo;
    constructor(profileRepo) {
        this.profileRepo = profileRepo;
    }
    async getOwnProfile(userId) {
        const profile = await this.profileRepo
            .createQueryBuilder('p')
            .innerJoin('p.user', 'u')
            .where('p.user_id = :userId', { userId })
            .andWhere('u.deleted_at IS NULL')
            .getOne();
        if (!profile)
            throw new common_1.NotFoundException('Profil nicht gefunden');
        return profile;
    }
    async updateOwnProfile(userId, dto) {
        const profile = await this.getOwnProfile(userId);
        if (dto.nickname !== undefined && dto.nickname !== profile.nickname) {
            const taken = await this.profileRepo.findOne({
                where: { nickname: dto.nickname },
            });
            if (taken)
                throw new common_1.ConflictException('Nickname bereits vergeben');
        }
        if (dto.nickname !== undefined)
            profile.nickname = dto.nickname;
        if (dto.bio !== undefined)
            profile.bio = dto.bio;
        if (dto.city !== undefined)
            profile.city = dto.city;
        if (dto.lang_simple !== undefined)
            profile.lang_simple = dto.lang_simple;
        if (dto.font_size !== undefined)
            profile.font_size = dto.font_size;
        if (dto.high_contrast !== undefined)
            profile.high_contrast = dto.high_contrast;
        if (dto.search_radius_km !== undefined)
            profile.search_radius_km = dto.search_radius_km;
        return this.profileRepo.save(profile);
    }
    async getPublicProfile(nickname) {
        const profile = await this.profileRepo
            .createQueryBuilder('p')
            .innerJoin('p.user', 'u')
            .select(['p.id', 'p.nickname', 'p.bio', 'p.city', 'p.photo_id'])
            .where('p.nickname = :nickname', { nickname })
            .andWhere('p.is_published = true')
            .andWhere('u.deleted_at IS NULL')
            .getOne();
        if (!profile)
            throw new common_1.NotFoundException('Profil nicht gefunden');
        return profile;
    }
};
exports.ProfileService = ProfileService;
exports.ProfileService = ProfileService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(profile_entity_1.Profile)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], ProfileService);
//# sourceMappingURL=profile.service.js.map