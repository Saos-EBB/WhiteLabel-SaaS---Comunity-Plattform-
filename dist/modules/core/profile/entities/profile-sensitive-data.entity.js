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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProfileSensitiveData = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("../../auth/entities/user.entity");
const consent_log_entity_1 = require("./consent-log.entity");
let ProfileSensitiveData = class ProfileSensitiveData {
    id;
    user_id;
    user;
    consent_id;
    consent;
    disability_type;
    disability_visible;
    collected_at;
    updated_at;
};
exports.ProfileSensitiveData = ProfileSensitiveData;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], ProfileSensitiveData.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'user_id' }),
    __metadata("design:type", String)
], ProfileSensitiveData.prototype, "user_id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'user_id' }),
    __metadata("design:type", user_entity_1.User)
], ProfileSensitiveData.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'consent_id' }),
    __metadata("design:type", String)
], ProfileSensitiveData.prototype, "consent_id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => consent_log_entity_1.ConsentLog, { onDelete: 'RESTRICT' }),
    (0, typeorm_1.JoinColumn)({ name: 'consent_id' }),
    __metadata("design:type", consent_log_entity_1.ConsentLog)
], ProfileSensitiveData.prototype, "consent", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'bytea', nullable: true }),
    __metadata("design:type", Object)
], ProfileSensitiveData.prototype, "disability_type", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], ProfileSensitiveData.prototype, "disability_visible", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz' }),
    __metadata("design:type", Date)
], ProfileSensitiveData.prototype, "collected_at", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz' }),
    __metadata("design:type", Date)
], ProfileSensitiveData.prototype, "updated_at", void 0);
exports.ProfileSensitiveData = ProfileSensitiveData = __decorate([
    (0, typeorm_1.Entity)('profile_sensitive_data')
], ProfileSensitiveData);
//# sourceMappingURL=profile-sensitive-data.entity.js.map