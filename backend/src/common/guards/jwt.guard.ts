import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Request } from 'express';

@Injectable()
export class JwtGuard {
    constructor(
        private readonly jwtService: JwtService,
        @InjectDataSource()
        private readonly dataSource: DataSource,
    ) { }

    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest<Request>();
        const token = this.extractToken(request);

        if (!token) throw new UnauthorizedException('Kein Token vorhanden');

        try {
            const payload = this.jwtService.verify(token, {
                secret: process.env.JWT_SECRET,
            });
            request['user'] = payload;

            this.dataSource.query(
                'UPDATE profiles SET last_active_at = NOW() WHERE user_id = $1',
                [payload.sub],
            ).catch(() => {});

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
