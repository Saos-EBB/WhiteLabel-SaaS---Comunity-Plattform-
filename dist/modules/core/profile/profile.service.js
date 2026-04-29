"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
const crypto = __importStar(require("crypto"));
const profile_entity_1 = require("./entities/profile.entity");
const user_entity_1 = require("../auth/entities/user.entity");
const interest_entity_1 = require("./entities/interest.entity");
const user_interest_entity_1 = require("./entities/user-interest.entity");
const agb_version_entity_1 = require("./entities/agb-version.entity");
const consent_log_entity_1 = require("./entities/consent-log.entity");
const profile_sensitive_data_entity_1 = require("./entities/profile-sensitive-data.entity");
const block_entity_1 = require("./entities/block.entity");
let ProfileService = class ProfileService {
    profileRepo;
    userRepo;
    interestRepo;
    userInterestRepo;
    agbVersionRepo;
    consentLogRepo;
    sensitiveDataRepo;
    blockRepo;
    constructor(profileRepo, userRepo, interestRepo, userInterestRepo, agbVersionRepo, consentLogRepo, sensitiveDataRepo, blockRepo) {
        this.profileRepo = profileRepo;
        this.userRepo = userRepo;
        this.interestRepo = interestRepo;
        this.userInterestRepo = userInterestRepo;
        this.agbVersionRepo = agbVersionRepo;
        this.consentLogRepo = consentLogRepo;
        this.sensitiveDataRepo = sensitiveDataRepo;
        this.blockRepo = blockRepo;
    }
    encryptField(value) {
        const key = Buffer.from(process.env.APP_ENCRYPTION_KEY ?? '', 'hex');
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
        const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
        return Buffer.concat([iv, encrypted]);
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
        const saved = await this.profileRepo.save(profile);
        await this.checkAndCompleteOnboarding(userId);
        return saved;
    }
    async checkAndCompleteOnboarding(userId) {
        const profile = await this.profileRepo.findOne({
            where: { user_id: userId },
            select: ['id', 'nickname', 'birthdate', 'city', 'onboarding_completed'],
        });
        if (!profile || profile.onboarding_completed)
            return;
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user?.is_verified)
            return;
        const [{ count }] = await this.profileRepo.manager.query('SELECT COUNT(*) AS count FROM user_interests WHERE user_id = $1', [userId]);
        const interestCount = parseInt(count, 10);
        if (profile.nickname &&
            profile.birthdate &&
            profile.city &&
            interestCount >= 1) {
            profile.onboarding_completed = true;
            await this.profileRepo.save(profile);
        }
    }
    async publishProfile(userId) {
        const profile = await this.getOwnProfile(userId);
        if (!profile.onboarding_completed) {
            throw new common_1.BadRequestException('Onboarding nicht abgeschlossen');
        }
        profile.is_published = true;
        return this.profileRepo.save(profile);
    }
    async getInterests() {
        return this.interestRepo.find();
    }
    async getUserInterests(userId) {
        return this.userInterestRepo.find({
            where: { user_id: userId },
            relations: ['interest'],
        });
    }
    async addInterest(userId, interestId) {
        const interest = await this.interestRepo.findOne({ where: { id: interestId } });
        if (!interest)
            throw new common_1.NotFoundException('Interesse nicht gefunden');
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
    async removeInterest(userId, interestId) {
        await this.userInterestRepo.delete({ user_id: userId, interest_id: interestId });
        return this.getUserInterests(userId);
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
    async searchProfiles(requestingUserId, city, interestIds) {
        const qb = this.profileRepo
            .createQueryBuilder('p')
            .innerJoin('p.user', 'u')
            .select(['p.id', 'p.nickname', 'p.bio', 'p.city', 'p.photo_id'])
            .where('p.is_published = true')
            .andWhere('u.is_banned = false')
            .andWhere('u.deleted_at IS NULL')
            .andWhere('p.user_id != :requestingUserId', { requestingUserId })
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
    async createSensitiveDataConsent(userId, ip) {
        const agbVersion = await this.agbVersionRepo.findOne({
            where: { type: 'sensitive_data', is_current: true },
        });
        if (!agbVersion)
            throw new common_1.NotFoundException('Keine aktuelle AGB-Version gefunden');
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
    async submitSensitiveData(userId, dto) {
        const consent = await this.consentLogRepo.findOne({
            where: { id: dto.consent_id },
        });
        if (!consent || consent.user_id !== userId || !consent.accepted) {
            throw new common_1.ForbiddenException('Ungültige oder fehlende Einwilligung');
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
    async blockUser(blockerId, blockedId) {
        if (blockerId === blockedId)
            throw new common_1.BadRequestException('Du kannst dich nicht selbst blockieren');
        const existing = await this.blockRepo.findOne({ where: { blocker_id: blockerId, blocked_id: blockedId } });
        if (existing)
            throw new common_1.ConflictException('Nutzer bereits blockiert');
        await this.blockRepo.save(this.blockRepo.create({ blocker_id: blockerId, blocked_id: blockedId }));
    }
    async unblockUser(blockerId, blockedId) {
        const existing = await this.blockRepo.findOne({ where: { blocker_id: blockerId, blocked_id: blockedId } });
        if (!existing)
            throw new common_1.NotFoundException('Blockierung nicht gefunden');
        await this.blockRepo.delete({ id: existing.id });
    }
};
exports.ProfileService = ProfileService;
exports.ProfileService = ProfileService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(profile_entity_1.Profile)),
    __param(1, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(2, (0, typeorm_1.InjectRepository)(interest_entity_1.Interest)),
    __param(3, (0, typeorm_1.InjectRepository)(user_interest_entity_1.UserInterest)),
    __param(4, (0, typeorm_1.InjectRepository)(agb_version_entity_1.AgbVersion)),
    __param(5, (0, typeorm_1.InjectRepository)(consent_log_entity_1.ConsentLog)),
    __param(6, (0, typeorm_1.InjectRepository)(profile_sensitive_data_entity_1.ProfileSensitiveData)),
    __param(7, (0, typeorm_1.InjectRepository)(block_entity_1.Block)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], ProfileService);
//# sourceMappingURL=profile.service.js.map