import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()
export class JwtGuard {
    constructor(private readonly jwtService: JwtService) { }

    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest<Request>();
        const token = this.extractToken(request);

        if (!token) throw new UnauthorizedException('Kein Token vorhanden');

        try {
            const payload = this.jwtService.verify(token, {
                secret: process.env.JWT_SECRET,
            });
            request['user'] = payload;
            return true;
        } catch {
            throw new UnauthorizedException('Token ungültig oder abgelaufen');
        }
    }

    private extractToken(request: Request): string | null {
        const auth = request.headers.authorization;
        if (!auth || !auth.startsWith('Bearer ')) return null;
        return auth.split(' ')[1];
    }
}