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
exports.ModerationController = void 0;
const common_1 = require("@nestjs/common");
const moderation_service_1 = require("./moderation.service");
const jwt_guard_1 = require("../../../common/guards/jwt.guard");
const create_report_dto_1 = require("./dto/create-report.dto");
let ModerationController = class ModerationController {
    moderationService;
    constructor(moderationService) {
        this.moderationService = moderationService;
    }
    createReport(req, dto) {
        return this.moderationService.createReport(req.user.sub, dto);
    }
    getReports(req) {
        return this.moderationService.getReports(req.user.sub);
    }
    getReport(req, id) {
        return this.moderationService.getReport(req.user.sub, id);
    }
    getStrikes(req) {
        return this.moderationService.getStrikes(req.user.sub);
    }
};
exports.ModerationController = ModerationController;
__decorate([
    (0, common_1.Post)('reports'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_report_dto_1.CreateReportDto]),
    __metadata("design:returntype", void 0)
], ModerationController.prototype, "createReport", null);
__decorate([
    (0, common_1.Get)('reports'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ModerationController.prototype, "getReports", null);
__decorate([
    (0, common_1.Get)('reports/:id'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ModerationController.prototype, "getReport", null);
__decorate([
    (0, common_1.Get)('strikes'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ModerationController.prototype, "getStrikes", null);
exports.ModerationController = ModerationController = __decorate([
    (0, common_1.Controller)('moderation'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    __metadata("design:paramtypes", [moderation_service_1.ModerationService])
], ModerationController);
//# sourceMappingURL=moderation.controller.js.map