import {
    BadRequestException,
    Injectable,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { User } from '../auth/entities/user.entity';
import { FileType, MediaUpload, ModerationStatus } from '../media/entities/media-upload.entity';
import { Report } from '../moderation/entities/report.entity';
import { Strike } from '../moderation/entities/strike.entity';
import { Profile } from '../profile/entities/profile.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MailService } from '../../../common/mail/mail.service';
import { decryptEmail } from '../../../common/crypto/crypto.helper';
import { ProfanityService } from '../moderation/profanity.service';
import { StrikeType } from '../moderation/dto/create-strike.dto';
import { BanUserDto, BanDuration } from './dto/ban-user.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { AdminCreateStrikeDto } from './dto/admin-create-strike.dto';
import { AddProfanityWordDto } from './dto/add-profanity-word.dto';
import { SetVulnerableFlagDto } from './dto/set-vulnerable-flag.dto';

@Injectable()
export class AdminService {
    private readonly logger = new Logger(AdminService.name);

    constructor(
        @InjectRepository(User)
        private readonly userRepo: Repository<User>,
        @InjectRepository(MediaUpload)
        private readonly mediaRepo: Repository<MediaUpload>,
        @InjectRepository(Report)
        private readonly reportRepo: Repository<Report>,
        @InjectRepository(Strike)
        private readonly strikeRepo: Repository<Strike>,
        @InjectRepository(Profile)
        private readonly profileRepo: Repository<Profile>,
        private readonly dataSource: DataSource,
        private readonly notificationsService: NotificationsService,
        private readonly mailService: MailService,
        private readonly eventEmitter: EventEmitter2,
        private readonly profanityService: ProfanityService,
    ) {}

    private calcBanExpiry(duration: BanDuration): Date | null {
        const ms: Record<Exclude<BanDuration, 'permanent'>, number> = {
            '24h': 1 * 24 * 60 * 60 * 1000,
            '7d':  7 * 24 * 60 * 60 * 1000,
            '30d': 30 * 24 * 60 * 60 * 1000,
        };
        return duration === 'permanent' ? null : new Date(Date.now() + ms[duration]);
    }

    // ── Existing ───────────────────────────────────────────────────────────────

    async setVulnerableFlag(userId: string, flag: boolean): Promise<Partial<User>> {
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user) throw new NotFoundException('Benutzer nicht gefunden');

        user.vulnerable_flag = flag;
        await this.userRepo.save(user);

        const { password_hash, google_id_hash, email_search_hash, email, email_verification_token, password_reset_token, ...safe } = user;
        return safe;
    }

    async exportUserData(userId: string) {
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user) throw new NotFoundException('Benutzer nicht gefunden');

        const {
            password_hash,
            google_id_hash,
            email_search_hash,
            email,
            email_verification_token,
            email_verification_expires_at,
            password_reset_token,
            password_reset_expires_at,
            ...safeUser
        } = user;

        const [
            profiles,
            userInterests,
            sensitiveRows,
            consentLogs,
            refreshTokens,
            subscriptions,
            paymentLogs,
            notifications,
            reportsSubmitted,
            reportsReceived,
            strikes,
            blocksGiven,
            blocksReceived,
            contactRequestsSent,
            contactRequestsReceived,
            mediaUploads,
            vulnerableFlagAudit,
        ] = await Promise.all([
            this.dataSource.query('SELECT * FROM profiles WHERE user_id = $1', [userId]),
            this.dataSource.query(
                `SELECT ui.id, ui.user_id, ui.created_at, i.name_de, i.name_en, i.category
                 FROM user_interests ui JOIN interests i ON i.id = ui.interest_id
                 WHERE ui.user_id = $1`,
                [userId],
            ),
            this.dataSource.query(
                `SELECT id, user_id, consent_id, disability_visible, collected_at, updated_at
                 FROM profile_sensitive_data WHERE user_id = $1`,
                [userId],
            ),
            this.dataSource.query('SELECT * FROM consent_logs WHERE user_id = $1', [userId]),
            this.dataSource.query(
                `SELECT id, user_id, device_info, expires_at, created_at
                 FROM refresh_tokens WHERE user_id = $1 AND is_revoked = false`,
                [userId],
            ),
            this.dataSource.query('SELECT * FROM subscriptions WHERE user_id = $1', [userId]),
            this.dataSource.query('SELECT * FROM payment_logs WHERE user_id = $1', [userId]),
            this.dataSource.query('SELECT * FROM notifications WHERE user_id = $1', [userId]),
            this.dataSource.query('SELECT * FROM reports WHERE reporter_id = $1', [userId]),
            this.dataSource.query('SELECT * FROM reports WHERE reported_user_id = $1', [userId]),
            this.dataSource.query('SELECT * FROM strikes WHERE user_id = $1', [userId]),
            this.dataSource.query('SELECT * FROM blocks WHERE blocker_id = $1', [userId]),
            this.dataSource.query('SELECT * FROM blocks WHERE blocked_id = $1', [userId]),
            this.dataSource.query('SELECT * FROM contact_requests WHERE sender_id = $1', [userId]),
            this.dataSource.query('SELECT * FROM contact_requests WHERE receiver_id = $1', [userId]),
            this.dataSource.query('SELECT * FROM media_uploads WHERE uploaded_by = $1', [userId]),
            this.dataSource.query('SELECT * FROM vulnerable_flag_audit WHERE user_id = $1', [userId]),
        ]);

        return {
            user: safeUser,
            profiles,
            user_interests: userInterests,
            profile_sensitive_data: sensitiveRows.map((row: any) => ({
                id: row.id,
                user_id: row.user_id,
                consent_id: row.consent_id,
                disability_type: '[verschlüsselt - auf Anfrage]',
                disability_visible: row.disability_visible,
                collected_at: row.collected_at,
                updated_at: row.updated_at,
            })),
            consent_logs: consentLogs,
            refresh_tokens: refreshTokens,
            subscriptions,
            payment_logs: paymentLogs,
            notifications,
            reports_submitted: reportsSubmitted,
            reports_received: reportsReceived,
            strikes,
            blocks_given: blocksGiven,
            blocks_received: blocksReceived,
            contact_requests_sent: contactRequestsSent,
            contact_requests_received: contactRequestsReceived,
            media_uploads: mediaUploads,
            vulnerable_flag_audit: vulnerableFlagAudit,
        };
    }

    // ── Media moderation ───────────────────────────────────────────────────────

    async getMediaPending(): Promise<{ id: string; file_url: string; file_type: string; uploaded_at: Date; uploaded_by: string; nickname: string | null }[]> {
        return this.dataSource.query(
            `SELECT m.id, m.file_url, m.file_type, m.uploaded_at, m.uploaded_by, p.nickname
             FROM   media_uploads m
             LEFT JOIN profiles p ON p.user_id = m.uploaded_by
             WHERE  m.moderation_status = 'pending'
               AND  m.deleted_at IS NULL
             ORDER  BY m.uploaded_at ASC`,
        );
    }

    async approveMedia(adminId: string, mediaId: string): Promise<void> {
        const media = await this.mediaRepo.findOne({ where: { id: mediaId } });
        if (!media) throw new NotFoundException('Medium nicht gefunden');

        await this.mediaRepo.update(mediaId, {
            moderation_status: ModerationStatus.APPROVED,
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
            media.file_type === FileType.AUDIO
                ? 'Deine Vorstellung wurde genehmigt'
                : 'Dein Profilbild wurde genehmigt',
        );
    }

    async rejectMedia(adminId: string, mediaId: string, reason: string): Promise<void> {
        const media = await this.mediaRepo.findOne({ where: { id: mediaId } });
        if (!media) throw new NotFoundException('Medium nicht gefunden');

        await this.mediaRepo.update(mediaId, {
            moderation_status: ModerationStatus.REJECTED,
            needs_review: false,
            reviewed_at: new Date(),
            reviewed_by: adminId,
            review_rejected_reason: reason,
        });

        await this.dataSource.query(
            `DELETE FROM admin_tickets WHERE type = 'image' AND status = 'open' AND context->>'media_id' = $1`,
            [mediaId],
        );

        await this.profileRepo.update(
            { user_id: media.uploaded_by, photo_id: mediaId },
            { photo_id: null },
        );

        await this.notificationsService.createNotification(
            media.uploaded_by,
            'system',
            media.file_type === FileType.AUDIO
                ? `Deine Vorstellung wurde abgelehnt: ${reason}`
                : `Dein Profilbild wurde abgelehnt: ${reason}`,
        );
    }

    // ── User management ────────────────────────────────────────────────────────

    async getUsers(opts: {
        role?: string;
        is_banned?: boolean;
        search?: string;
        page: number;
        limit: number;
    }) {
        const { role, is_banned, search, page, limit } = opts;
        const offset = (page - 1) * limit;

        const params: (string | boolean | number | null)[] = [];
        const push = (v: string | boolean | number | null) => { params.push(v); return `$${params.length}`; };

        const roleParam    = push(role    ?? null);
        const bannedParam  = push(is_banned ?? null);
        const searchParam  = push(search ? `%${search}%` : null);
        const limitParam   = push(limit);
        const offsetParam  = push(offset);

        const rows = await this.dataSource.query(
            `SELECT u.id, u.role, u.is_banned, u.ban_reason, u.ban_expires_at,
                    u.is_verified, u.vulnerable_flag, u.enhanced_protection,
                    u.created_at, u.last_login, u.deleted_at,
                    p.nickname, p.photo_id
             FROM   users u
             LEFT JOIN profiles p ON p.user_id = u.id
             WHERE  (${roleParam}::text   IS NULL OR u.role     = ${roleParam}::user_role)
               AND  (${bannedParam}::boolean IS NULL OR u.is_banned = ${bannedParam}::boolean)
               AND  (${searchParam}::text  IS NULL OR LOWER(p.nickname) LIKE LOWER(${searchParam}::text))
             ORDER  BY u.created_at DESC
             LIMIT  ${limitParam} OFFSET ${offsetParam}`,
            params,
        );

        const [{ total }] = await this.dataSource.query(
            `SELECT COUNT(*) AS total
             FROM   users u
             LEFT JOIN profiles p ON p.user_id = u.id
             WHERE  (${roleParam}::text   IS NULL OR u.role     = ${roleParam}::user_role)
               AND  (${bannedParam}::boolean IS NULL OR u.is_banned = ${bannedParam}::boolean)
               AND  (${searchParam}::text  IS NULL OR LOWER(p.nickname) LIKE LOWER(${searchParam}::text))`,
            params.slice(0, 3),
        );

        return { data: rows, total: parseInt(total, 10), page, limit };
    }

    async banUser(adminId: string, userId: string, dto: BanUserDto): Promise<{ success: true; ban_expires_at: Date | null; type: 'temp' | 'permanent' }> {
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user) throw new NotFoundException('Benutzer nicht gefunden');
        if (user.is_banned) throw new BadRequestException('Benutzer ist bereits gesperrt');

        const ban_expires_at = this.calcBanExpiry(dto.duration);
        const type: 'temp' | 'permanent' = dto.duration === 'permanent' ? 'permanent' : 'temp';

        user.is_banned      = true;
        user.ban_reason     = dto.reason;
        user.ban_expires_at = ban_expires_at;
        await this.userRepo.save(user);

        const strike = this.strikeRepo.create({
            user_id:    userId,
            report_id:  dto.report_id ?? null,
            issued_by:  adminId,
            type:       type === 'permanent' ? StrikeType.PERMANENT : StrikeType.TEMP,
            reason:     dto.reason,
            expires_at: ban_expires_at,
        });
        await this.strikeRepo.save(strike);

        await this.notificationsService.createNotification(
            userId,
            'ban',
            ban_expires_at
                ? `Dein Konto wurde gesperrt bis ${ban_expires_at.toISOString()}: ${dto.reason}`
                : `Dein Konto wurde dauerhaft gesperrt: ${dto.reason}`,
        );

        const email = decryptEmail(user.email as Buffer | null);
        if (email) {
            try {
                await this.mailService.sendBanEmail(email, dto.reason, ban_expires_at);
            } catch (err) {
                this.logger.error(`Ban-E-Mail an ${userId} fehlgeschlagen`, err);
            }
        }

        this.eventEmitter.emit('user.banned', { userId });

        return { success: true, ban_expires_at, type };
    }

    async unbanUser(userId: string): Promise<void> {
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user) throw new NotFoundException('Benutzer nicht gefunden');
        if (!user.is_banned) throw new BadRequestException('Benutzer ist nicht gesperrt');

        user.is_banned      = false;
        user.ban_reason     = null;
        user.ban_expires_at = null;
        await this.userRepo.save(user);

        this.eventEmitter.emit('user.unbanned', { userId });
    }

    async setUserRole(userId: string, dto: UpdateUserRoleDto): Promise<Partial<User>> {
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user) throw new NotFoundException('Benutzer nicht gefunden');

        user.role = dto.role;
        await this.userRepo.save(user);

        const { password_hash, google_id_hash, email_search_hash, email,
                email_verification_token, password_reset_token, ...safe } = user;
        return safe;
    }

    // ── Reports ────────────────────────────────────────────────────────────────

    async getAdminReports(opts: { status?: string; page: number; limit: number }) {
        const { status, page, limit } = opts;
        const offset = (page - 1) * limit;

        const rows = await this.dataSource.query(
            `SELECT r.*,
                    rp.nickname  AS reporter_nickname,
                    rpd.nickname AS reported_nickname
             FROM   reports r
             LEFT JOIN profiles rp  ON rp.user_id  = r.reporter_id
             LEFT JOIN profiles rpd ON rpd.user_id = r.reported_user_id
             WHERE  ($1::text IS NULL OR r.status = $1::report_status)
               AND  r.deleted_at IS NULL
             ORDER  BY r.created_at DESC
             LIMIT  $2 OFFSET $3`,
            [status ?? null, limit, offset],
        );

        const [{ total }] = await this.dataSource.query(
            `SELECT COUNT(*) AS total FROM reports
             WHERE ($1::text IS NULL OR status = $1::report_status) AND deleted_at IS NULL`,
            [status ?? null],
        );

        return { data: rows, total: parseInt(total, 10), page, limit };
    }

    async updateReport(adminId: string, reportId: string, dto: UpdateReportDto): Promise<Report> {
        const report = await this.reportRepo.findOne({ where: { id: reportId } });
        if (!report) throw new NotFoundException('Meldung nicht gefunden');
        if (report.status === 'closed') throw new BadRequestException('Meldung ist bereits geschlossen');

        report.status      = dto.status;
        report.reviewed_by = adminId;
        report.reviewed_at = new Date();
        if (dto.note !== undefined) report.note = dto.note;

        return this.reportRepo.save(report);
    }

    // ── Strikes ────────────────────────────────────────────────────────────────

    async getAdminStrikes(opts: { page: number; limit: number }) {
        const { page, limit } = opts;
        const offset = (page - 1) * limit;

        const rows = await this.dataSource.query(
            `SELECT s.*, p.nickname AS user_nickname
             FROM   strikes s
             LEFT JOIN profiles p ON p.user_id = s.user_id
             ORDER  BY s.created_at DESC
             LIMIT  $1 OFFSET $2`,
            [limit, offset],
        );

        const [{ total }] = await this.dataSource.query('SELECT COUNT(*) AS total FROM strikes');

        return { data: rows, total: parseInt(total, 10), page, limit };
    }

    async createAdminStrike(adminId: string, dto: AdminCreateStrikeDto): Promise<Strike> {
        if (dto.type === StrikeType.TEMP && !dto.expires_at) {
            throw new BadRequestException('expires_at ist erforderlich bei temporärem Strike');
        }
        if (dto.type === StrikeType.PERMANENT && dto.expires_at) {
            throw new BadRequestException('expires_at darf nicht gesetzt sein bei permanentem Strike');
        }

        const user = await this.userRepo.findOne({ where: { id: dto.user_id } });
        if (!user) throw new NotFoundException('Benutzer nicht gefunden');

        const strike = this.strikeRepo.create({
            user_id:   dto.user_id,
            report_id: null,
            issued_by: adminId,
            type:      dto.type,
            reason:    dto.reason,
            expires_at: dto.expires_at ?? null,
        });
        await this.strikeRepo.save(strike);

        if (dto.type === StrikeType.TEMP || dto.type === StrikeType.PERMANENT) {
            user.is_banned      = true;
            user.ban_reason     = dto.reason;
            user.ban_expires_at = dto.expires_at ?? null;
            await this.userRepo.save(user);

            await this.notificationsService.createNotification(
                dto.user_id,
                'ban',
                dto.type === StrikeType.PERMANENT
                    ? `Dein Konto wurde dauerhaft gesperrt: ${dto.reason}`
                    : `Dein Konto wurde vorübergehend gesperrt: ${dto.reason}`,
            );
        }

        return strike;
    }

    // ── Profanity word list ────────────────────────────────────────────────────

    getProfanityWords() {
        return this.profanityService.getCustomWords();
    }

    addProfanityWord(dto: AddProfanityWordDto, adminId: string) {
        return this.profanityService.addCustomWord(dto.word, adminId);
    }

    removeProfanityWord(word: string) {
        return this.profanityService.removeCustomWord(word);
    }
}
