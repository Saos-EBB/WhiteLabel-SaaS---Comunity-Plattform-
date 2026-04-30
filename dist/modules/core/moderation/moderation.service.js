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
exports.ModerationService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const report_entity_1 = require("./entities/report.entity");
const strike_entity_1 = require("./entities/strike.entity");
const user_entity_1 = require("../auth/entities/user.entity");
const create_strike_dto_1 = require("./dto/create-strike.dto");
let ModerationService = class ModerationService {
    reportRepository;
    strikeRepository;
    userRepository;
    constructor(reportRepository, strikeRepository, userRepository) {
        this.reportRepository = reportRepository;
        this.strikeRepository = strikeRepository;
        this.userRepository = userRepository;
    }
    async createReport(reporterId, dto) {
        if (reporterId === dto.reported_user_id) {
            throw new common_1.BadRequestException('Eigene Person kann nicht gemeldet werden');
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
    async getReports(reporterId) {
        return this.reportRepository.find({
            where: { reporter_id: reporterId },
            order: { created_at: 'DESC' },
        });
    }
    async getReport(reporterId, reportId) {
        const report = await this.reportRepository.findOne({
            where: { id: reportId, reporter_id: reporterId },
        });
        if (!report)
            throw new common_1.NotFoundException('Meldung nicht gefunden');
        return report;
    }
    async getStrikes(userId) {
        return this.strikeRepository.find({
            where: { user_id: userId },
            order: { created_at: 'DESC' },
        });
    }
    async createStrike(adminId, dto) {
        const user = await this.userRepository.findOne({ where: { id: dto.user_id } });
        if (!user)
            throw new common_1.NotFoundException('Benutzer nicht gefunden');
        const report = await this.reportRepository.findOne({ where: { id: dto.report_id } });
        if (!report)
            throw new common_1.NotFoundException('Meldung nicht gefunden');
        if (dto.type === create_strike_dto_1.StrikeType.TEMP && !dto.expires_at) {
            throw new common_1.BadRequestException('expires_at ist erforderlich bei temporärem Strike');
        }
        if (dto.type === create_strike_dto_1.StrikeType.PERMANENT && dto.expires_at) {
            throw new common_1.BadRequestException('expires_at darf nicht gesetzt sein bei permanentem Strike');
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
        if (dto.type === create_strike_dto_1.StrikeType.TEMP || dto.type === create_strike_dto_1.StrikeType.PERMANENT) {
            user.is_banned = true;
            user.ban_reason = dto.reason;
            user.ban_expires_at = dto.expires_at ?? null;
            await this.userRepository.save(user);
        }
        return strike;
    }
    async reviewReport(adminId, reportId, dto) {
        const report = await this.reportRepository.findOne({ where: { id: reportId } });
        if (!report)
            throw new common_1.NotFoundException('Meldung nicht gefunden');
        if (report.status === 'closed')
            throw new common_1.ForbiddenException('Meldung ist bereits geschlossen');
        report.status = dto.status;
        report.intent_category = dto.intent_category ?? null;
        report.reviewed_by = adminId;
        report.reviewed_at = new Date();
        return this.reportRepository.save(report);
    }
};
exports.ModerationService = ModerationService;
exports.ModerationService = ModerationService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(report_entity_1.Report)),
    __param(1, (0, typeorm_1.InjectRepository)(strike_entity_1.Strike)),
    __param(2, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], ModerationService);
//# sourceMappingURL=moderation.service.js.map