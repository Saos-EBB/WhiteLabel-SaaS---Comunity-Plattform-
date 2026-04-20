import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { User } from './entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
export declare class AuthService {
    private readonly userRepository;
    private readonly refreshTokenRepository;
    private readonly jwtService;
    constructor(userRepository: Repository<User>, refreshTokenRepository: Repository<RefreshToken>, jwtService: JwtService);
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
    }>;
    logout(rawToken: string): Promise<{
        message: string;
    }>;
}
