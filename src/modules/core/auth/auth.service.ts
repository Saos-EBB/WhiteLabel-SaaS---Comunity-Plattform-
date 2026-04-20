import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { User } from './entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';

@Injectable()
export class AuthService {
    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        @InjectRepository(RefreshToken)
        private readonly refreshTokenRepository: Repository<RefreshToken>,
        private readonly jwtService: JwtService,
    ) { }

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
        return { message: 'Registrierung erfolgreich' };
    }

    async login(dto: LoginDto) {
        const emailHash = this.hashEmail(dto.email);

        const user = await this.userRepository.findOne({
            where: { email_search_hash: emailHash },
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

        const user = await this.userRepository.findOne({ where: { id: stored.user_id } });
        if (!user) throw new UnauthorizedException('User nicht gefunden');

        const payload = { sub: user.id, role: user.role };
        const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });

        return { accessToken };
    }

    async logout(rawToken: string) {
        const tokenHash = this.hashToken(rawToken);

        await this.refreshTokenRepository.update(
            { token_hash: tokenHash },
            { is_revoked: true },
        );

        return { message: 'Erfolgreich ausgeloggt' };
    }
}