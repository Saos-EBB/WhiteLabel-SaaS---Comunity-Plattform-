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
exports.ConsentLog = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("../../auth/entities/user.entity");
const agb_version_entity_1 = require("./agb-version.entity");
let ConsentLog = class ConsentLog {
    id;
    user_id;
    user;
    agb_version_id;
    agb_version;
    accepted;
    accepted_at;
    ip_hash;
    tp_hash;
    withdrawn_at;
    withdraw_reason;
};
exports.ConsentLog = ConsentLog;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], ConsentLog.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'user_id' }),
    __metadata("design:type", String)
], ConsentLog.prototype, "user_id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'user_id' }),
    __metadata("design:type", user_entity_1.User)
], ConsentLog.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'agb_version_id' }),
    __metadata("design:type", String)
], ConsentLog.prototype, "agb_version_id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => agb_version_entity_1.AgbVersion, { onDelete: 'RESTRICT' }),
    (0, typeorm_1.JoinColumn)({ name: 'agb_version_id' }),
    __metadata("design:type", agb_version_entity_1.AgbVersion)
], ConsentLog.prototype, "agb_version", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean' }),
    __metadata("design:type", Boolean)
], ConsentLog.prototype, "accepted", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz' }),
    __metadata("design:type", Date)
], ConsentLog.prototype, "accepted_at", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 64 }),
    __metadata("design:type", String)
], ConsentLog.prototype, "ip_hash", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 64, nullable: true }),
    __metadata("design:type", Object)
], ConsentLog.prototype, "tp_hash", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], ConsentLog.prototype, "withdrawn_at", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], ConsentLog.prototype, "withdraw_reason", void 0);
exports.ConsentLog = ConsentLog = __decorate([
    (0, typeorm_1.Entity)('consent_logs')
], ConsentLog);
//# sourceMappingURL=consent-log.entity.js.map