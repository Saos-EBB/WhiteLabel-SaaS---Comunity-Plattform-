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
const search_profile_dto_1 = require("./dto/search-profile.dto");
const submit_sensitive_data_dto_1 = require("./dto/submit-sensitive-data.dto");
let ProfileController = class ProfileController {
    profileService;
    constructor(profileService) {
        this.profileService = profileService;
    }
    getInterests() {
        return this.profileService.getInterests();
    }
    getOwnProfile(req) {
        return this.profileService.getOwnProfile(req.user.sub);
    }
    updateOwnProfile(req, dto) {
        return this.profileService.updateOwnProfile(req.user.sub, dto);
    }
    publishProfile(req) {
        return this.profileService.publishProfile(req.user.sub);
    }
    getUserInterests(req) {
        return this.profileService.getUserInterests(req.user.sub);
    }
    addInterest(req, interestId) {
        return this.profileService.addInterest(req.user.sub, interestId);
    }
    removeInterest(req, interestId) {
        return this.profileService.removeInterest(req.user.sub, interestId);
    }
    searchProfiles(req, query) {
        return this.profileService.searchProfiles(req.user.sub, query.city, query.interests);
    }
    createSensitiveDataConsent(req) {
        const ip = req.ip ?? '0.0.0.0';
        return this.profileService.createSensitiveDataConsent(req.user.sub, ip);
    }
    submitSensitiveData(req, dto) {
        return this.profileService.submitSensitiveData(req.user.sub, dto);
    }
    blockUser(req, userId) {
        return this.profileService.blockUser(req.user.sub, userId);
    }
    unblockUser(req, userId) {
        return this.profileService.unblockUser(req.user.sub, userId);
    }
    getPublicProfile(nickname) {
        return this.profileService.getPublicProfile(nickname);
    }
};
exports.ProfileController = ProfileController;
__decorate([
    (0, common_1.Get)('interests'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ProfileController.prototype, "getInterests", null);
__decorate([
    (0, common_1.Get)('me'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ProfileController.prototype, "getOwnProfile", null);
__decorate([
    (0, common_1.Put)('me'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, update_profile_dto_1.UpdateProfileDto]),
    __metadata("design:returntype", void 0)
], ProfileController.prototype, "updateOwnProfile", null);
__decorate([
    (0, common_1.Patch)('me/publish'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ProfileController.prototype, "publishProfile", null);
__decorate([
    (0, common_1.Get)('me/interests'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ProfileController.prototype, "getUserInterests", null);
__decorate([
    (0, common_1.Post)('me/interests/:interestId'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('interestId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ProfileController.prototype, "addInterest", null);
__decorate([
    (0, common_1.Delete)('me/interests/:interestId'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('interestId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ProfileController.prototype, "removeInterest", null);
__decorate([
    (0, common_1.Get)('search'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, search_profile_dto_1.SearchProfileDto]),
    __metadata("design:returntype", void 0)
], ProfileController.prototype, "searchProfiles", null);
__decorate([
    (0, common_1.Post)('me/consent/sensitive-data'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ProfileController.prototype, "createSensitiveDataConsent", null);
__decorate([
    (0, common_1.Post)('me/sensitive-data'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, submit_sensitive_data_dto_1.SubmitSensitiveDataDto]),
    __metadata("design:returntype", void 0)
], ProfileController.prototype, "submitSensitiveData", null);
__decorate([
    (0, common_1.Post)('me/block/:userId'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ProfileController.prototype, "blockUser", null);
__decorate([
    (0, common_1.Delete)('me/block/:userId'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtGuard),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ProfileController.prototype, "unblockUser", null);
__decorate([
    (0, common_1.Get)(':nickname'),
    __param(0, (0, common_1.Param)('nickname')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ProfileController.prototype, "getPublicProfile", null);
exports.ProfileController = ProfileController = __decorate([
    (0, common_1.Controller)('profile'),
    __metadata("design:paramtypes", [profile_service_1.ProfileService])
], ProfileController);
//# sourceMappingURL=profile.controller.js.map