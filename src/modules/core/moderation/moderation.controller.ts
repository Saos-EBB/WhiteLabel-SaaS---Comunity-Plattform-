import { Controller, Get, Post, Body, Param, Request, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ModerationService } from './moderation.service';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { CreateReportDto } from './dto/create-report.dto';

@Controller('moderation')
@UseGuards(JwtGuard)
export class ModerationController {
    constructor(private readonly moderationService: ModerationService) { }

    @Post('reports')
    createReport(@Request() req: any, @Body() dto: CreateReportDto) {
        return this.moderationService.createReport(req.user.sub, dto);
    }

    @Get('reports')
    getReports(@Request() req: any) {
        return this.moderationService.getReports(req.user.sub);
    }

    @Get('reports/:id')
    getReport(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
        return this.moderationService.getReport(req.user.sub, id);
    }

    @Get('strikes')
    getStrikes(@Request() req: any) {
        return this.moderationService.getStrikes(req.user.sub);
    }
}
