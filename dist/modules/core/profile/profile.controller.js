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
exports.ProfileController = void 0;
const common_1 = require("@nestjs/common");
const jwt_guard_1 = require("../../../common/guards/jwt.guard");
const profile_service_1 = require("./profile.service");
const update_profile_dto_1 = require("./dto/update-profile.dto");
let ProfileController = class ProfileController {
    profileService;
    constructor(profileService) {
        this.profileService = profileService;
    }
    getOwnProfile(req) {
        return this.profileService.getOwnProfile(req.user.sub);
    }
    updateOwnProfile(req, dto) {
        return this.profileService.updateOwnProfile(req.user.sub, dto);
    }
    getPublicProfile(nickname) {
        return this.profileService.getPublicProfile(nickname);
    }
};
exports.ProfileController = ProfileController;
__decorate([
    (0, common_1.Get)('me'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ProfileController.prototype, "getOwnProfile", null);
__decorate([
    (0, common_1.Put)('me'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, update_profile_dto_1.UpdateProfileDto]),
    __metadata("design:returntype", void 0)
], ProfileController.prototype, "updateOwnProfile", null);
__decorate([
    (0, common_1.Get)(':nickname'),
    __param(0, (0, common_1.Param)('nickname')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ProfileController.prototype, "getPublicProfile", null);
exports.ProfileController = ProfileController = __decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    (0, common_1.Controller)('profile'),
    __metadata("design:paramtypes", [profile_service_1.ProfileService])
], ProfileController);
//# sourceMappingURL=profile.controller.js.map