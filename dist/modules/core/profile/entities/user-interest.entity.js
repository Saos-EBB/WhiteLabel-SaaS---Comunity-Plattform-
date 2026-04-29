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
exports.UserInterest = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("../../auth/entities/user.entity");
const interest_entity_1 = require("./interest.entity");
let UserInterest = class UserInterest {
    id;
    user_id;
    user;
    interest_id;
    interest;
    created_at;
};
exports.UserInterest = UserInterest;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], UserInterest.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'user_id' }),
    __metadata("design:type", String)
], UserInterest.prototype, "user_id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'user_id' }),
    __metadata("design:type", user_entity_1.User)
], UserInterest.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'interest_id' }),
    __metadata("design:type", String)
], UserInterest.prototype, "interest_id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => interest_entity_1.Interest, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'interest_id' }),
    __metadata("design:type", interest_entity_1.Interest)
], UserInterest.prototype, "interest", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ type: 'timestamptz' }),
    __metadata("design:type", Date)
], UserInterest.prototype, "created_at", void 0);
exports.UserInterest = UserInterest = __decorate([
    (0, typeorm_1.Entity)('user_interests')
], UserInterest);
//# sourceMappingURL=user-interest.entity.js.map