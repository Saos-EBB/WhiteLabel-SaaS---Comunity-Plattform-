import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Report } from './entities/report.entity';
import { Strike } from './entities/strike.entity';
import { CreateReportDto } from './dto/create-report.dto';

@Injectable()
export class ModerationService {
    constructor(
        @InjectRepository(Report)
        private readonly reportRepository: Repository<Report>,
        @InjectRepository(Strike)
        private readonly strikeRepository: Repository<Strike>,
    ) { }

    async createReport(reporterId: string, dto: CreateReportDto) {
        if (reporterId === dto.reported_user_id) {
            throw new BadRequestException('Eigene Person kann nicht gemeldet werden');
        }

        const report = this.reportRepository.create({
            reporter_id: reporterId,
            reported_user_id: dto.reported_user_id,
            message_id: dto.message_id ?? null,
            reason: dto.reason,
            description: dto.description ?? null,
            status: 'open',
            intent_category: null,
            reviewed_by: null,
            reviewed_at: null,
        });

        return this.reportRepository.save(report);
    }

    async getReports(reporterId: string) {
        return this.reportRepository.find({
            where: { reporter_id: reporterId },
            order: { created_at: 'DESC' },
        });
    }

    async getReport(reporterId: string, reportId: string) {
        const report = await this.reportRepository.findOne({
            where: { id: reportId, reporter_id: reporterId },
        });

        if (!report) throw new NotFoundException('Meldung nicht gefunden');
        return report;
    }

    async getStrikes(userId: string) {
        return this.strikeRepository.find({
            where: { user_id: userId },
            order: { created_at: 'DESC' },
        });
    }
}
