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
exports.AgbVersion = exports.AgbType = void 0;
const typeorm_1 = require("typeorm");
var AgbType;
(function (AgbType) {
    AgbType["AGB"] = "agb";
    AgbType["PRIVACY"] = "privacy";
    AgbType["SENSITIVE_DATA"] = "sensitive_data";
})(AgbType || (exports.AgbType = AgbType = {}));
let AgbVersion = class AgbVersion {
    id;
    version;
    type;
    content_normal;
    content_simple;
    content_url;
    valid_from;
    valid_until;
    is_current;
};
exports.AgbVersion = AgbVersion;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], AgbVersion.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 20 }),
    __metadata("design:type", String)
], AgbVersion.prototype, "version", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: AgbType }),
    __metadata("design:type", String)
], AgbVersion.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], AgbVersion.prototype, "content_normal", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], AgbVersion.prototype, "content_simple", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 512, nullable: true }),
    __metadata("design:type", Object)
], AgbVersion.prototype, "content_url", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz' }),
    __metadata("design:type", Date)
], AgbVersion.prototype, "valid_from", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], AgbVersion.prototype, "valid_until", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean' }),
    __metadata("design:type", Boolean)
], AgbVersion.prototype, "is_current", void 0);
exports.AgbVersion = AgbVersion = __decorate([
    (0, typeorm_1.Entity)('agb_versions')
], AgbVersion);
//# sourceMappingURL=agb-version.entity.js.map