import { applyDecorators, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../guards/jwt.guard';
import { PremiumGuard } from '../guards/premium.guard';

export function RequiresPremium() {
    return applyDecorators(UseGuards(JwtGuard, PremiumGuard));
}
