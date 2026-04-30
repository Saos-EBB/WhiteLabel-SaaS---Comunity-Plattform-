import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { User } from '../auth/entities/user.entity';

@Injectable()
export class AdminService {
    constructor(
        @InjectRepository(User)
        private readonly userRepo: Repository<User>,
        private readonly dataSource: DataSource,
    ) {}

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
            this.dataSource.query(
                'SELECT * FROM profiles WHERE user_id = $1',
                [userId],
            ),
            this.dataSource.query(
                `SELECT ui.id, ui.user_id, ui.created_at,
                        i.name_de, i.name_en, i.category
                 FROM user_interests ui
                 JOIN interests i ON i.id = ui.interest_id
                 WHERE ui.user_id = $1`,
                [userId],
            ),
            this.dataSource.query(
                `SELECT id, user_id, consent_id, disability_visible, collected_at, updated_at
                 FROM profile_sensitive_data WHERE user_id = $1`,
                [userId],
            ),
            this.dataSource.query(
                'SELECT * FROM consent_logs WHERE user_id = $1',
                [userId],
            ),
            this.dataSource.query(
                `SELECT id, user_id, device_info, expires_at, created_at
                 FROM refresh_tokens WHERE user_id = $1 AND is_revoked = false`,
                [userId],
            ),
            this.dataSource.query(
                'SELECT * FROM subscriptions WHERE user_id = $1',
                [userId],
            ),
            this.dataSource.query(
                'SELECT * FROM payment_logs WHERE user_id = $1',
                [userId],
            ),
            this.dataSource.query(
                'SELECT * FROM notifications WHERE user_id = $1',
                [userId],
            ),
            this.dataSource.query(
                'SELECT * FROM reports WHERE reporter_id = $1',
                [userId],
            ),
            this.dataSource.query(
                'SELECT * FROM reports WHERE reported_user_id = $1',
                [userId],
            ),
            this.dataSource.query(
                'SELECT * FROM strikes WHERE user_id = $1',
                [userId],
            ),
            this.dataSource.query(
                'SELECT * FROM blocks WHERE blocker_id = $1',
                [userId],
            ),
            this.dataSource.query(
                'SELECT * FROM blocks WHERE blocked_id = $1',
                [userId],
            ),
            this.dataSource.query(
                'SELECT * FROM contact_requests WHERE sender_id = $1',
                [userId],
            ),
            this.dataSource.query(
                'SELECT * FROM contact_requests WHERE receiver_id = $1',
                [userId],
            ),
            this.dataSource.query(
                'SELECT * FROM media_uploads WHERE uploaded_by = $1',
                [userId],
            ),
            this.dataSource.query(
                'SELECT * FROM vulnerable_flag_audit WHERE user_id = $1',
                [userId],
            ),
        ]);

        const profileSensitiveData = sensitiveRows.map((row: any) => ({
            id: row.id,
            user_id: row.user_id,
            consent_id: row.consent_id,
            disability_type: '[verschlüsselt - auf Anfrage]',
            disability_visible: row.disability_visible,
            collected_at: row.collected_at,
            updated_at: row.updated_at,
        }));

        return {
            user: safeUser,
            profiles,
            user_interests: userInterests,
            profile_sensitive_data: profileSensitiveData,
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
}
