import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { SupportService } from './support.service';
import { ContactSupportDto } from './dto/contact-support.dto';

@Controller('support')
export class SupportController {
    constructor(private readonly supportService: SupportService) {}

    // 3 requests per IP per hour — public endpoint, no auth guard
    @Post('contact')
    @HttpCode(HttpStatus.OK)
    @Throttle({ default: { ttl: 3_600_000, limit: 3 } })
    async contact(@Body() dto: ContactSupportDto): Promise<{ message: string }> {
        await this.supportService.createSupportTicket(dto);
        return { message: 'Anfrage übermittelt' };
    }
}
