"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const user_entity_1 = require("../auth/entities/user.entity");
let AdminService = class AdminService {
    userRepo;
    dataSource;
    constructor(userRepo, dataSource) {
        this.userRepo = userRepo;
        this.dataSource = dataSource;
    }
    async setVulnerableFlag(userId, flag) {
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user)
            throw new common_1.NotFoundException('Benutzer nicht gefunden');
        user.vulnerable_flag = flag;
        await this.userRepo.save(user);
        const { password_hash, google_id_hash, email_search_hash, email, email_verification_token, password_reset_token, ...safe } = user;
        return safe;
    }
    async exportUserData(userId) {
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user)
            throw new common_1.NotFoundException('Benutzer nicht gefunden');
        const { password_hash, google_id_hash, email_search_hash, email, email_verification_token, email_verification_expires_at, password_reset_token, password_reset_expires_at, ...safeUser } = user;
        const [profiles, userInterests, sensitiveRows, consentLogs, refreshTokens, subscriptions, paymentLogs, notifications, reportsSubmitted, reportsReceived, strikes, blocksGiven, blocksReceived, contactRequestsSent, contactRequestsReceived, mediaUploads, vulnerableFlagAudit,] = await Promise.all([
            this.dataSource.query('SELECT * FROM profiles WHERE user_id = $1', [userId]),
            this.dataSource.query(`SELECT ui.id, ui.user_id, ui.created_at,
                        i.name_de, i.name_en, i.category
                 FROM user_interests ui
                 JOIN interests i ON i.id = ui.interest_id
                 WHERE ui.user_id = $1`, [userId]),
            this.dataSource.query(`SELECT id, user_id, consent_id, disability_visible, collected_at, updated_at
                 FROM profile_sensitive_data WHERE user_id = $1`, [userId]),
            this.dataSource.query('SELECT * FROM consent_logs WHERE user_id = $1', [userId]),
            this.dataSource.query(`SELECT id, user_id, device_info, expires_at, created_at
                 FROM refresh_tokens WHERE user_id = $1 AND is_revoked = false`, [userId]),
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
        const profileSensitiveData = sensitiveRows.map((row) => ({
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
};
exports.AdminService = AdminService;
exports.AdminService = AdminService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.DataSource])
], AdminService);
//# sourceMappingURL=admin.service.js.map