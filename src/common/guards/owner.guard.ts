import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class OwnerGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();
        const user = request['user'];

        if (user?.role === 'owner') return true;

        throw new ForbiddenException('Keine Berechtigung');
    }
}
