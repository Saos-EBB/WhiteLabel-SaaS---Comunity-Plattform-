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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = __importStar(require("bcrypt"));
const crypto = __importStar(require("crypto"));
const user_entity_1 = require("./entities/user.entity");
const refresh_token_entity_1 = require("./entities/refresh-token.entity");
const profile_entity_1 = require("../profile/entities/profile.entity");
const mail_service_1 = require("../../../common/mail/mail.service");
let AuthService = class AuthService {
    userRepository;
    refreshTokenRepository;
    profileRepository;
    jwtService;
    mailService;
    constructor(userRepository, refreshTokenRepository, profileRepository, jwtService, mailService) {
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.profileRepository = profileRepository;
        this.jwtService = jwtService;
        this.mailService = mailService;
    }
    generateNickname(email) {
        const local = email.split('@')[0];
        const stripped = local.replace(/[^a-zA-Z0-9]/g, '');
        const truncated = stripped.slice(0, 20);
        const digits = Math.floor(1000 + Math.random() * 9000).toString();
        return truncated + digits;
    }
    hashEmail(email) {
        const salt = process.env.EMAIL_SALT ?? '';
        return crypto
            .createHash('sha256')
            .update(email.toLowerCase().trim() + salt)
            .digest('hex');
    }
    hashToken(token) {
        return crypto.createHash('sha256').update(token).digest('hex');
    }
    generateRefreshToken() {
        return crypto.randomBytes(64).toString('hex');
    }
    async register(dto) {
        const emailHash = this.hashEmail(dto.email);
        const exists = await this.userRepository.findOne({
            where: { email_search_hash: emailHash },
        });
        if (exists)
            throw new common_1.ConflictException('Email bereits registriert');
        const passwordHash = await bcrypt.hash(dto.password, 12);
        const user = this.userRepository.create({
            email_search_hash: emailHash,
            password_hash: passwordHash,
        });
        await this.userRepository.save(user);
        const profile = this.profileRepository.create({
            user_id: user.id,
            nickname: this.generateNickname(dto.email),
            birthdate: '1990-01-01',
            is_published: false,
            onboarding_completed: false,
            updated_at: new Date(),
        });
        await this.profileRepository.save(profile);
        await this.sendVerificationEmail(user.id, dto.email);
        return { message: 'Registrierung erfolgreich' };
    }
    async login(dto) {
        const emailHash = this.hashEmail(dto.email);
        const user = await this.userRepository.findOne({
            where: { email_search_hash: emailHash, deleted_at: (0, typeorm_2.IsNull)() },
        });
        if (!user)
            throw new common_1.UnauthorizedException('Ungültige Zugangsdaten');
        const passwordValid = await bcrypt.compare(dto.password, user.password_hash ?? '');
        if (!passwordValid)
            throw new common_1.UnauthorizedException('Ungültige Zugangsdaten');
        const payload = { sub: user.id, role: user.role };
        const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
        const rawRefreshToken = this.generateRefreshToken();
        const tokenHash = this.hashToken(rawRefreshToken);
        const refreshToken = this.refreshTokenRepository.create({
            user_id: user.id,
            token_hash: tokenHash,
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        });
        await this.refreshTokenRepository.save(refreshToken);
        return { accessToken, refreshToken: rawRefreshToken };
    }
    async refresh(rawToken) {
        const tokenHash = this.hashToken(rawToken);
        const stored = await this.refreshTokenRepository.findOne({
            where: { token_hash: tokenHash, is_revoked: false },
        });
        if (!stored)
            throw new common_1.UnauthorizedException('Ungültiger Token');
        if (stored.expires_at < new Date())
            throw new common_1.UnauthorizedException('Token abgelaufen');
        const user = await this.userRepository.findOne({ where: { id: stored.user_id, deleted_at: (0, typeorm_2.IsNull)() } });
        if (!user)
            throw new common_1.UnauthorizedException('User nicht gefunden');
        await this.refreshTokenRepository.update({ token_hash: stored.token_hash }, { is_revoked: true });
        const newRawToken = this.generateRefreshToken();
        const newTokenHash = this.hashToken(newRawToken);
        const newRefreshToken = this.refreshTokenRepository.create({
            user_id: user.id,
            token_hash: newTokenHash,
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        });
        await this.refreshTokenRepository.save(newRefreshToken);
        const payload = { sub: user.id, role: user.role };
        const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
        return { accessToken, refreshToken: newRawToken };
    }
    async logout(rawToken) {
        const tokenHash = this.hashToken(rawToken);
        await this.refreshTokenRepository.update({ token_hash: tokenHash }, { is_revoked: true });
        return { message: 'Erfolgreich ausgeloggt' };
    }
    async sendVerificationEmail(userId, email) {
        const token = crypto.randomBytes(32).toString('hex');
        const tokenHash = this.hashToken(token);
        await this.userRepository.update(userId, {
            email_verification_token: tokenHash,
            email_verification_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
        });
        await this.mailService.sendVerificationEmail(email, token);
        return { message: 'Verifizierungs-Email gesendet' };
    }
    async verifyEmail(token) {
        const tokenHash = this.hashToken(token);
        const user = await this.userRepository.findOne({
            where: { email_verification_token: tokenHash, deleted_at: (0, typeorm_2.IsNull)() },
        });
        if (!user)
            throw new common_1.UnauthorizedException('Ungültiger Token');
        if (user.email_verification_expires_at < new Date()) {
            throw new common_1.UnauthorizedException('Token abgelaufen');
        }
        await this.userRepository.update(user.id, {
            is_verified: true,
            email_verified_at: new Date(),
            email_verification_token: null,
            email_verification_expires_at: null,
        });
        return { message: 'Email erfolgreich bestätigt' };
    }
    async forgotPassword(email) {
        const emailHash = this.hashEmail(email);
        const user = await this.userRepository.findOne({
            where: { email_search_hash: emailHash, deleted_at: (0, typeorm_2.IsNull)() },
        });
        if (!user)
            return { message: 'Falls die Email existiert, wurde eine Email gesendet' };
        const token = crypto.randomBytes(32).toString('hex');
        const tokenHash = this.hashToken(token);
        await this.userRepository.update(user.id, {
            password_reset_token: tokenHash,
            password_reset_expires_at: new Date(Date.now() + 60 * 60 * 1000),
        });
        await this.mailService.sendPasswordResetEmail(email, token);
        return { message: 'Falls die Email existiert, wurde eine Email gesendet' };
    }
    async resetPassword(token, newPassword) {
        const tokenHash = this.hashToken(token);
        const user = await this.userRepository.findOne({
            where: { password_reset_token: tokenHash, deleted_at: (0, typeorm_2.IsNull)() },
        });
        if (!user)
            throw new common_1.UnauthorizedException('Ungültiger Token');
        if (user.password_reset_expires_at < new Date()) {
            throw new common_1.UnauthorizedException('Token abgelaufen');
        }
        const passwordHash = await bcrypt.hash(newPassword, 12);
        await this.userRepository.update(user.id, {
            password_hash: passwordHash,
            password_reset_token: null,
            password_reset_expires_at: null,
        });
        return { message: 'Passwort erfolgreich geändert' };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(1, (0, typeorm_1.InjectRepository)(refresh_token_entity_1.RefreshToken)),
    __param(2, (0, typeorm_1.InjectRepository)(profile_entity_1.Profile)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        jwt_1.JwtService,
        mail_service_1.MailService])
], AuthService);
//# sourceMappingURL=auth.service.js.map