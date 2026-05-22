import { Injectable, BadRequestException, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Report } from './entities/report.entity';
import { Strike } from './entities/strike.entity';
import { User } from '../auth/entities/user.entity';
import { MediaUpload } from '../media/entities/media-upload.entity';
import { Profile } from '../profile/entities/profile.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MailService } from '../../../common/mail/mail.service';
import { decryptEmail } from '../../../common/crypto/crypto.helper';
import { CreateReportDto } from './dto/create-report.dto';
import { CreateReviewDto } from './dto/create-review.dto';
import { CreateStrikeDto, StrikeType } from './dto/create-strike.dto';

const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000';

@Injectable()
export class ModerationService {
    private readonly logger = new Logger(ModerationService.name);

    constructor(
        @InjectRepository(Report)
        private readonly reportRepository: Repository<Report>,
        @InjectRepository(Strike)
        private readonly strikeRepository: Repository<Strike>,
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        @InjectRepository(MediaUpload)
        private readonly mediaUploadRepository: Repository<MediaUpload>,
        @InjectRepository(Profile)
        private readonly profileRepository: Repository<Profile>,
        @InjectDataSource()
        private readonly dataSource: DataSource,
        private readonly notificationsService: NotificationsService,
        private readonly mailService: MailService,
        private readonly eventEmitter: EventEmitter2,
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

        const saved = await this.reportRepository.save(report);

        void this.checkAutoSuspend(dto.reported_user_id, saved.id).catch((err) =>
            this.logger.error(`checkAutoSuspend fehlgeschlagen für User ${dto.reported_user_id}`, err),
        );

        return saved;
    }

    async checkAutoSuspend(reportedUserId: string, reportId: string): Promise<void> {
        const result = await this.dataSource.query<[{ count: string }]>(
            `SELECT COUNT(DISTINCT reporter_id) AS count
             FROM reports
             WHERE reported_user_id = $1
               AND status = 'open'
               AND deleted_at IS NULL`,
            [reportedUserId],
        );

        if (parseInt(result[0]?.count ?? '0', 10) < 10) return;

        const user = await this.userRepository.findOne({ where: { id: reportedUserId } });
        if (!user || user.is_banned) return;

        user.is_banned      = true;
        user.ban_reason     = 'Automatische Sperre: 10 unabhängige Meldungen eingegangen.';
        user.ban_expires_at = null;
        await this.userRepository.save(user);

        this.eventEmitter.emit('user.banned', { userId: reportedUserId });

        const strike = this.strikeRepository.create({
            user_id:    reportedUserId,
            report_id:  reportId,
            issued_by:  SYSTEM_USER_ID,
            type:       StrikeType.PERMANENT,
            reason:     'Auto-Suspend: 10 offene Reports von verschiedenen Nutzern.',
            expires_at: null,
        });
        await this.strikeRepository.save(strike);

        await this.notificationsService.createNotification(
            reportedUserId,
            'system',
            'Dein Konto wurde gesperrt',
        );

        const email = decryptEmail(user.email as Buffer | null);
        if (email) {
            try {
                await this.mailService.sendAutoSuspendEmail(email);
            } catch (err) {
                this.logger.error(`Auto-Suspend-E-Mail an ${reportedUserId} fehlgeschlagen`, err);
            }
        }
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

    async getMediaQueue(): Promise<{ id: string; file_url: string; uploaded_at: Date; uploaded_by: string; nickname: string | null }[]> {
        return this.dataSource.query(
            `SELECT m.id, m.file_url, m.uploaded_at, m.uploaded_by, p.nickname
             FROM media_uploads m
             LEFT JOIN profiles p ON p.user_id = m.uploaded_by
             WHERE m.needs_review = true
             ORDER BY m.uploaded_at ASC`,
        );
    }

    async approveMedia(adminId: string, mediaId: string): Promise<void> {
        const media = await this.mediaUploadRepository.findOne({ where: { id: mediaId } });
        if (!media) throw new NotFoundException('Medium nicht gefunden');

        await this.mediaUploadRepository.update(mediaId, {
            needs_review: false,
            reviewed_at: new Date(),
            reviewed_by: adminId,
        });

        await this.dataSource.query(
            `DELETE FROM admin_tickets WHERE type = 'image' AND status = 'open' AND context->>'media_id' = $1`,
            [mediaId],
        );

        await this.notificationsService.createNotification(
            media.uploaded_by,
            'system',
            'Dein Profilbild wurde genehmigt',
        );
    }

    async rejectMedia(adminId: string, mediaId: string, reason: string): Promise<void> {
        const media = await this.mediaUploadRepository.findOne({ where: { id: mediaId } });
        if (!media) throw new NotFoundException('Medium nicht gefunden');

        await this.mediaUploadRepository.update(mediaId, {
            reviewed_at: new Date(),
            reviewed_by: adminId,
            review_rejected_reason: reason,
        });

        await this.dataSource.query(
            `DELETE FROM admin_tickets WHERE type = 'image' AND status = 'open' AND context->>'media_id' = $1`,
            [mediaId],
        );

        await this.notificationsService.createNotification(
            media.uploaded_by,
            'system',
            `Dein Profilbild wurde abgelehnt: ${reason}`,
        );

        await this.profileRepository.update(
            { user_id: media.uploaded_by, photo_id: mediaId },
            { photo_id: null },
        );
    }
}
