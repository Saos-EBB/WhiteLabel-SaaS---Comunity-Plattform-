import { Injectable, ConflictException, UnauthorizedException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, MoreThan } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ConsentItemDto } from './dto/consent.dto';
import { User } from './entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { Profile } from '../profile/entities/profile.entity';
import { AgbVersion } from '../profile/entities/agb-version.entity';
import { ConsentLog } from '../profile/entities/consent-log.entity';
import { MailService } from '../../../common/mail/mail.service';

@Injectable()
export class AuthService {
    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        @InjectRepository(RefreshToken)
        private readonly refreshTokenRepository: Repository<RefreshToken>,
        @InjectRepository(Profile)
        private readonly profileRepository: Repository<Profile>,
        @InjectRepository(AgbVersion)
        private readonly agbVersionRepository: Repository<AgbVersion>,
        @InjectRepository(ConsentLog)
        private readonly consentLogRepository: Repository<ConsentLog>,
        private readonly jwtService: JwtService,
        private readonly mailService: MailService,
    ) { }

    private generateNickname(email: string): string {
        const local = email.split('@')[0];
        const stripped = local.replace(/[^a-zA-Z0-9]/g, '');
        const truncated = stripped.slice(0, 20);
        const digits = Math.floor(1000 + Math.random() * 9000).toString();
        return truncated + digits;
    }

    private hashEmail(email: string): string {
        if (!process.env.EMAIL_SALT) throw new Error('EMAIL_SALT env var is not set');
        const salt = process.env.EMAIL_SALT;
        return crypto
            .createHash('sha256')
            .update(email.toLowerCase().trim() + salt)
            .digest('hex');
    }

    private hashToken(token: string): string {
        return crypto.createHash('sha256').update(token).digest('hex');
    }

    private encryptEmail(email: string): Buffer {
        const rawKey = process.env.APP_ENCRYPTION_KEY;
        if (!rawKey) throw new Error('APP_ENCRYPTION_KEY is not set');
        const key = Buffer.from(rawKey, 'hex');
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
        const encrypted = Buffer.concat([cipher.update(email, 'utf8'), cipher.final()]);
        return Buffer.concat([iv, encrypted]);
    }

    private decryptEmail(data: Buffer): string {
        const rawKey = process.env.APP_ENCRYPTION_KEY;
        if (!rawKey) throw new Error('APP_ENCRYPTION_KEY is not set');
        const key = Buffer.from(rawKey, 'hex');
        const iv = data.subarray(0, 16);
        const encrypted = data.subarray(16);
        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
        return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
    }

    private generateRefreshToken(): string {
        return crypto.randomBytes(64).toString('hex');
    }

    async register(dto: RegisterDto) {
        const emailHash = this.hashEmail(dto.email);

        const exists = await this.userRepository.findOne({
            where: { email_search_hash: emailHash },
        });
        if (exists) throw new ConflictException('Email bereits registriert');

        const passwordHash = await bcrypt.hash(dto.password, 12);

        const user = this.userRepository.create({
            email_search_hash: emailHash,
            password_hash: passwordHash,
            email: this.encryptEmail(dto.email),
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

        await this.sendVerificationEmail(user.id);
        return { message: 'Registrierung erfolgreich' };
    }

    async login(dto: LoginDto) {
        const emailHash = this.hashEmail(dto.email);

        const user = await this.userRepository.findOne({
            where: { email_search_hash: emailHash, deleted_at: IsNull() },
        });

        if (!user) throw new UnauthorizedException('Ungültige Zugangsdaten');

        const passwordValid = await bcrypt.compare(dto.password, user.password_hash ?? '');
        if (!passwordValid) throw new UnauthorizedException('Ungültige Zugangsdaten');

        if (user.is_banned) {
            if (user.ban_expires_at && user.ban_expires_at < new Date()) {
                user.is_banned = false;
                user.ban_reason = null;
                user.ban_expires_at = null;
                await this.userRepository.save(user);
            } else {
                const suffix = user.ban_expires_at ? ` bis ${user.ban_expires_at.toISOString()}` : '';
                throw new ForbiddenException(`Ihr Account ist gesperrt${suffix}`);
            }
        }

        const payload = { sub: user.id, role: user.role };
        const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });

        const rawRefreshToken = this.generateRefreshToken();
        const tokenHash = this.hashToken(rawRefreshToken);

        const refreshToken = this.refreshTokenRepository.create({
            user_id: user.id,
            token_hash: tokenHash,
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        });

        user.last_login = new Date();
        await this.userRepository.save(user);

        await this.refreshTokenRepository.save(refreshToken);

        const currentVersions = await this.agbVersionRepository.find({ where: { is_current: true } });
        const acceptedLogs = await this.consentLogRepository.find({
            where: { user_id: user.id, accepted: true },
        });
        const acceptedVersionIds = new Set(acceptedLogs.map((l) => l.agb_version_id));
        const needsConsent = currentVersions.some((v) => !acceptedVersionIds.has(v.id));

        return { accessToken, rawRefreshToken, needsConsent };
    }

    async refresh(rawToken: string) {
        const tokenHash = this.hashToken(rawToken);

        const stored = await this.refreshTokenRepository.findOne({
            where: { token_hash: tokenHash, is_revoked: false },
        });

        if (!stored) throw new UnauthorizedException('Ungültiger Token');
        if (stored.expires_at < new Date()) throw new UnauthorizedException('Token abgelaufen');

        const user = await this.userRepository.findOne({ where: { id: stored.user_id, deleted_at: IsNull() } });
        if (!user) throw new UnauthorizedException('User nicht gefunden');

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

        return { accessToken, rawRefreshToken: newRawToken };
    }

    async logout(rawToken: string) {
        const tokenHash = this.hashToken(rawToken);

        await this.refreshTokenRepository.update(
            { token_hash: tokenHash },
            { is_revoked: true },
        );

        return { message: 'Erfolgreich ausgeloggt' };
    }

    async sendVerificationEmail(userId: string) {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user?.email) throw new NotFoundException('User nicht gefunden');
        const email = this.decryptEmail(user.email);

        const token = crypto.randomBytes(32).toString('hex');
        const tokenHash = this.hashToken(token);

        await this.userRepository.update(userId, {
            email_verification_token: tokenHash,
            email_verification_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
        });

        await this.mailService.sendVerificationEmail(email, token);
        return { message: 'Verifizierungs-Email gesendet' };
    }

    async verifyEmail(token: string) {
        const tokenHash = this.hashToken(token);

        const user = await this.userRepository.findOne({
            where: {
                email_verification_token: tokenHash,
                email_verification_expires_at: MoreThan(new Date()),
                email_verified_at: IsNull(),
            },
        });

        if (!user) throw new NotFoundException('Token ungültig oder abgelaufen');

        user.email_verified_at = new Date();
        user.email_verification_token = null;
        user.email_verification_expires_at = null;
        user.is_verified = true;
        await this.userRepository.save(user);

        return { message: 'Email erfolgreich bestätigt' };
    }

    async forgotPassword(email: string) {
        const emailHash = this.hashEmail(email);
        const user = await this.userRepository.findOne({
            where: { email_search_hash: emailHash, deleted_at: IsNull() },
        });

        if (!user) return { message: 'Falls die Email existiert, wurde eine Mail gesendet' };

        const token = crypto.randomBytes(32).toString('hex');
        const tokenHash = this.hashToken(token);

        await this.userRepository.update(user.id, {
            password_reset_token: tokenHash,
            password_reset_expires_at: new Date(Date.now() + 60 * 60 * 1000),
        });

        const contactEmail = this.decryptEmail(user.email!);
        try {
            await this.mailService.sendPasswordResetEmail(contactEmail, token);
        } catch {
        }
        return { message: 'Falls die Email existiert, wurde eine Mail gesendet' };
    }

    // @dev-only — must never exist in production
    async devDeleteUser(email: string) {
        const emailHash = this.hashEmail(email);
        const user = await this.userRepository.findOne({ where: { email_search_hash: emailHash } });
        if (user) await this.userRepository.remove(user);
        return { message: 'User deleted' };
    }

    async resetPassword(token: string, newPassword: string) {
        const tokenHash = this.hashToken(token);

        const user = await this.userRepository.findOne({
            where: {
                password_reset_token: tokenHash,
                password_reset_expires_at: MoreThan(new Date()),
            },
        });

        if (!user) throw new NotFoundException('Token ungültig oder abgelaufen');

        user.password_hash = await bcrypt.hash(newPassword, 12);
        user.password_reset_token = null;
        user.password_reset_expires_at = null;
        await this.userRepository.save(user);

        return { message: 'Passwort erfolgreich geändert' };
    }

    async getAgbVersions(): Promise<AgbVersion[]> {
        return this.agbVersionRepository.find({ where: { is_current: true } });
    }

    async createConsents(
        userId: string,
        consents: ConsentItemDto[],
        ip: string,
    ): Promise<{ success: true }> {
        const ipHash = crypto.createHash('sha256').update(ip).digest('hex');
        const now = new Date();

        const entries = consents.map((c) =>
            this.consentLogRepository.create({
                user_id: userId,
                agb_version_id: c.agb_version_id,
                accepted: c.accepted,
                accepted_at: now,
                ip_hash: ipHash,
                withdrawn_at: null,
                withdraw_reason: null,
            }),
        );

        await this.consentLogRepository.upsert(entries, {
            conflictPaths: ['user_id', 'agb_version_id'],
            skipUpdateIfNoValuesChanged: false,
        });

        return { success: true };
    }
}