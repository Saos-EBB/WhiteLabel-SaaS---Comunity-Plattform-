import { Controller, Get, Request, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { GdprService } from './gdpr.service';

@Controller('gdpr')
@UseGuards(JwtGuard)
export class GdprController {
    constructor(private readonly gdprService: GdprService) {}

    @Get('export')
    async exportData(@Request() req: any, @Res() res: Response) {
        const buffer = await this.gdprService.generateExport(req.user.sub);
        const filename = `paarship-daten-${new Date().toISOString().slice(0, 10)}.pdf`;
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Content-Length': buffer.length.toString(),
        });
        res.end(buffer);
    }
}
