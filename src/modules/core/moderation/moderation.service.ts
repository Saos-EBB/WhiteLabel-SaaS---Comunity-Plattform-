import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Report } from './entities/report.entity';
import { Strike } from './entities/strike.entity';
import { User } from '../auth/entities/user.entity';
import { CreateReportDto } from './dto/create-report.dto';
import { CreateReviewDto } from './dto/create-review.dto';
import { CreateStrikeDto, StrikeType } from './dto/create-strike.dto';

@Injectable()
export class ModerationService {
    constructor(
        @InjectRepository(Report)
        private readonly reportRepository: Repository<Report>,
        @InjectRepository(Strike)
        private readonly strikeRepository: Repository<Strike>,
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
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

    async createStrike(adminId: string, dto: CreateStrikeDto) {
        const user = await this.userRepository.findOne({ where: { id: dto.user_id } });
        if (!user) throw new NotFoundException('Benutzer nicht gefunden');

        const report = await this.reportRepository.findOne({ where: { id: dto.report_id } });
        if (!report) throw new NotFoundException('Meldung nicht gefunden');

        if (dto.type === StrikeType.TEMP && !dto.expires_at) {
            throw new BadRequestException('expires_at ist erforderlich bei temporärem Strike');
        }
        if (dto.type === StrikeType.PERMANENT && dto.expires_at) {
            throw new BadRequestException('expires_at darf nicht gesetzt sein bei permanentem Strike');
        }

        const strike = this.strikeRepository.create({
            user_id: dto.user_id,
            report_id: dto.report_id,
            issued_by: adminId,
            type: dto.type,
            reason: dto.reason,
            expires_at: dto.expires_at ?? null,
        });
        await this.strikeRepository.save(strike);

        if (dto.type === StrikeType.TEMP || dto.type === StrikeType.PERMANENT) {
            user.is_banned = true;
            user.ban_reason = dto.reason;
            user.ban_expires_at = dto.expires_at ?? null;
            await this.userRepository.save(user);
        }

        return strike;
    }

    async reviewReport(adminId: string, reportId: string, dto: CreateReviewDto) {
        const report = await this.reportRepository.findOne({ where: { id: reportId } });
        if (!report) throw new NotFoundException('Meldung nicht gefunden');
        if (report.status === 'closed') throw new ForbiddenException('Meldung ist bereits geschlossen');

        report.status = dto.status;
        report.intent_category = dto.intent_category ?? null;
        report.reviewed_by = adminId;
        report.reviewed_at = new Date();

        return this.reportRepository.save(report);
    }
}
