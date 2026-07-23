import { Injectable, ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Request } from 'express';

@Injectable()
export class OptionalJwtGuard {
    constructor(
        private readonly jwtService: JwtService,
        @InjectDataSource()
        private readonly dataSource: DataSource,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<Request>();
        const token = this.extractToken(request);

        if (!token) return true;

        try {
            const payload = this.jwtService.verify(token, {
                secret: process.env.JWT_SECRET,
            });

            const [{ exists }] = await this.dataSource.query(
                'SELECT EXISTS (SELECT 1 FROM users WHERE id = $1 AND deleted_at IS NULL) AS exists',
                [payload.sub],
            );
            if (!exists) return true;

            request['user'] = payload;

            this.dataSource.query(
                'UPDATE profiles SET last_active_at = NOW() WHERE user_id = $1',
                [payload.sub],
            ).catch(() => {});
        } catch {
            // invalid or expired token, or user no longer exists — leave req.user undefined
        }

        return true;
    }

    private extractToken(request: Request): string | null {
        const auth = request.headers.authorization;
        if (!auth || !auth.startsWith('Bearer ')) return null;
        return auth.split(' ')[1];
    }
}
