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
exports.Profile = exports.FontSizeOption = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("../../auth/entities/user.entity");
var FontSizeOption;
(function (FontSizeOption) {
    FontSizeOption["NORMAL"] = "normal";
    FontSizeOption["LARGE"] = "large";
    FontSizeOption["XL"] = "xl";
})(FontSizeOption || (exports.FontSizeOption = FontSizeOption = {}));
let Profile = class Profile {
    id;
    user_id;
    user;
    nickname;
    birthdate;
    bio;
    photo_id;
    city;
    location;
    search_radius_km;
    lang_simple;
    font_size;
    high_contrast;
    is_published;
    onboarding_completed;
    updated_at;
};
exports.Profile = Profile;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Profile.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'user_id' }),
    __metadata("design:type", String)
], Profile.prototype, "user_id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'user_id' }),
    __metadata("design:type", user_entity_1.User)
], Profile.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 30, unique: true }),
    __metadata("design:type", String)
], Profile.prototype, "nickname", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date' }),
    __metadata("design:type", String)
], Profile.prototype, "birthdate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], Profile.prototype, "bio", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], Profile.prototype, "photo_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", Object)
], Profile.prototype, "city", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true, select: false, update: false, insert: false }),
    __metadata("design:type", Object)
], Profile.prototype, "location", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', default: 20 }),
    __metadata("design:type", Number)
], Profile.prototype, "search_radius_km", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], Profile.prototype, "lang_simple", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: FontSizeOption, default: FontSizeOption.NORMAL }),
    __metadata("design:type", String)
], Profile.prototype, "font_size", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], Profile.prototype, "high_contrast", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], Profile.prototype, "is_published", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], Profile.prototype, "onboarding_completed", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz' }),
    __metadata("design:type", Date)
], Profile.prototype, "updated_at", void 0);
exports.Profile = Profile = __decorate([
    (0, typeorm_1.Entity)('profiles')
], Profile);
//# sourceMappingURL=profile.entity.js.map