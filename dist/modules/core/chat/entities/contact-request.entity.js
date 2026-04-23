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
exports.ContactRequest = exports.ContactRequestStatus = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("../../auth/entities/user.entity");
var ContactRequestStatus;
(function (ContactRequestStatus) {
    ContactRequestStatus["PENDING"] = "pending";
    ContactRequestStatus["ACCEPTED"] = "accepted";
    ContactRequestStatus["DECLINED"] = "declined";
})(ContactRequestStatus || (exports.ContactRequestStatus = ContactRequestStatus = {}));
let ContactRequest = class ContactRequest {
    id;
    sender_id;
    sender;
    receiver_id;
    receiver;
    message_preview;
    status;
    created_at;
};
exports.ContactRequest = ContactRequest;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], ContactRequest.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'sender_id' }),
    __metadata("design:type", String)
], ContactRequest.prototype, "sender_id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'sender_id' }),
    __metadata("design:type", user_entity_1.User)
], ContactRequest.prototype, "sender", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'receiver_id' }),
    __metadata("design:type", String)
], ContactRequest.prototype, "receiver_id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'receiver_id' }),
    __metadata("design:type", user_entity_1.User)
], ContactRequest.prototype, "receiver", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 300, nullable: true }),
    __metadata("design:type", Object)
], ContactRequest.prototype, "message_preview", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: ContactRequestStatus, default: ContactRequestStatus.PENDING }),
    __metadata("design:type", String)
], ContactRequest.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], ContactRequest.prototype, "created_at", void 0);
exports.ContactRequest = ContactRequest = __decorate([
    (0, typeorm_1.Entity)('contact_requests')
], ContactRequest);
//# sourceMappingURL=contact-request.entity.js.map