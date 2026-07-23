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

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<Request>();
        const token = this.extractToken(request);

        if (!token) throw new UnauthorizedException('Kein Token vorhanden');

        let payload: any;
        try {
            payload = this.jwtService.verify(token, {
                secret: process.env.JWT_SECRET,
            });
        } catch {
            throw new UnauthorizedException('Token ungültig oder abgelaufen');
        }

        const [{ exists }] = await this.dataSource.query(
            'SELECT EXISTS (SELECT 1 FROM users WHERE id = $1 AND deleted_at IS NULL) AS exists',
            [payload.sub],
        );
        if (!exists) throw new UnauthorizedException('User nicht gefunden');

        request['user'] = payload;

        this.dataSource.query(
            'UPDATE profiles SET last_active_at = NOW() WHERE user_id = $1',
            [payload.sub],
        ).catch(() => {});

        return true;
    }

    private extractToken(request: Request): string | null {
        const auth = request.headers.authorization;
        if (!auth || !auth.startsWith('Bearer ')) return null;
        return auth.split(' ')[1];
    }
}
