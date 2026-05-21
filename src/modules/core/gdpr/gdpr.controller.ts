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
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'attachment; filename="paarship-daten-export.pdf"',
        });
        res.send(buffer);
    }
}
