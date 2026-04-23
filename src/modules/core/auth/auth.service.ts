import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { User } from './entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { Profile } from '../profile/entities/profile.entity';
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
        const salt = process.env.EMAIL_SALT ?? '';
        return crypto
            .createHash('sha256')
            .update(email.toLowerCase().trim() + salt)
            .digest('hex');
    }

    private hashToken(token: string): string {
        return crypto.createHash('sha256').update(token).digest('hex');
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

    async login(dto: LoginDto) {
        const emailHash = this.hashEmail(dto.email);

        const user = await this.userRepository.findOne({
            where: { email_search_hash: emailHash, deleted_at: IsNull() },
        });

        if (!user) throw new UnauthorizedException('Ungültige Zugangsdaten');

        const passwordValid = await bcrypt.compare(dto.password, user.password_hash ?? '');
        if (!passwordValid) throw new UnauthorizedException('Ungültige Zugangsdaten');

        const payload = { sub: user.id, role: user.role };
        const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });

        // Refresh Token generieren und speichern
        const rawRefreshToken = this.generateRefreshToken();
        const tokenHash = this.hashToken(rawRefreshToken);

        const refreshToken = this.refreshTokenRepository.create({
            user_id: user.id,
            token_hash: tokenHash,
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 Tage
        });

        await this.refreshTokenRepository.save(refreshToken);

        return { accessToken, refreshToken: rawRefreshToken };
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

        return { accessToken, refreshToken: newRawToken };
    }

    async logout(rawToken: string) {
        const tokenHash = this.hashToken(rawToken);

        await this.refreshTokenRepository.update(
            { token_hash: tokenHash },
            { is_revoked: true },
        );

        return { message: 'Erfolgreich ausgeloggt' };
    }

    async sendVerificationEmail(userId: string, email: string) {
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
            where: { email_verification_token: tokenHash, deleted_at: IsNull() },
        });

        if (!user) throw new UnauthorizedException('Ungültiger Token');
        if (user.email_verification_expires_at! < new Date()) {
            throw new UnauthorizedException('Token abgelaufen');
        }

        await this.userRepository.update(user.id, {
            is_verified: true,
            email_verified_at: new Date(),
            email_verification_token: null,
            email_verification_expires_at: null,
        });

        return { message: 'Email erfolgreich bestätigt' };
    }

    async forgotPassword(email: string) {
        const emailHash = this.hashEmail(email);
        const user = await this.userRepository.findOne({
            where: { email_search_hash: emailHash, deleted_at: IsNull() },
        });

        if (!user) return { message: 'Falls die Email existiert, wurde eine Email gesendet' };

        const token = crypto.randomBytes(32).toString('hex');
        const tokenHash = this.hashToken(token);

        await this.userRepository.update(user.id, {
            password_reset_token: tokenHash,
            password_reset_expires_at: new Date(Date.now() + 60 * 60 * 1000),
        });

        await this.mailService.sendPasswordResetEmail(email, token);
        return { message: 'Falls die Email existiert, wurde eine Email gesendet' };
    }

    async resetPassword(token: string, newPassword: string) {
        const tokenHash = this.hashToken(token);

        const user = await this.userRepository.findOne({
            where: { password_reset_token: tokenHash, deleted_at: IsNull() },
        });

        if (!user) throw new UnauthorizedException('Ungültiger Token');
        if (user.password_reset_expires_at! < new Date()) {
            throw new UnauthorizedException('Token abgelaufen');
        }

        const passwordHash = await bcrypt.hash(newPassword, 12);

        await this.userRepository.update(user.id, {
            password_hash: passwordHash,
            password_reset_token: null,
            password_reset_expires_at: null,
        });

        return { message: 'Passwort erfolgreich geändert' };
    }
}