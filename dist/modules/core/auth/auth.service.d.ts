import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { User } from './entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { Profile } from '../profile/entities/profile.entity';
import { MailService } from '../../../common/mail/mail.service';
export declare class AuthService {
    private readonly userRepository;
    private readonly refreshTokenRepository;
    private readonly profileRepository;
    private readonly jwtService;
    private readonly mailService;
    constructor(userRepository: Repository<User>, refreshTokenRepository: Repository<RefreshToken>, profileRepository: Repository<Profile>, jwtService: JwtService, mailService: MailService);
    private generateNickname;
    private hashEmail;
    private hashToken;
    private generateRefreshToken;
    register(dto: RegisterDto): Promise<{
        message: string;
    }>;
    login(dto: LoginDto): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    refresh(rawToken: string): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    logout(rawToken: string): Promise<{
        message: string;
    }>;
    sendVerificationEmail(userId: string, email: string): Promise<{
        message: string;
    }>;
    verifyEmail(token: string): Promise<{
        message: string;
    }>;
    forgotPassword(email: string): Promise<{
        message: string;
    }>;
    resetPassword(token: string, newPassword: string): Promise<{
        message: string;
    }>;
}
