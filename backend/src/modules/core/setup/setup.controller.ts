import { Body, Controller, Get, Post, Req, ForbiddenException } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { SetupService } from './setup.service';
import { CreateOwnerDto } from './dto/create-owner.dto';

// In-memory permanent counter per IP — persists for the lifetime of the process.
// For a multi-instance deployment, swap this for a Redis counter.
const setupAttempts = new Map<string, number>();
const SETUP_MAX_ATTEMPTS = 5;

@Controller('setup')
@SkipThrottle()
export class SetupController {
    constructor(private readonly setupService: SetupService) {}

    @Get('status')
    getStatus() {
        return this.setupService.getStatus();
    }

    @Post()
    async createOwner(@Body() dto: CreateOwnerDto, @Req() req: any) {
        const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
            ?? req.socket?.remoteAddress
            ?? 'unknown';

        const attempts = setupAttempts.get(ip) ?? 0;
        if (attempts >= SETUP_MAX_ATTEMPTS) {
            throw new ForbiddenException('Zu viele Setup-Versuche von dieser IP');
        }
        setupAttempts.set(ip, attempts + 1);

        return this.setupService.createOwner(dto);
    }
}
