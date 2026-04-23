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
exports.Conversation = exports.ConversationStatus = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("../../auth/entities/user.entity");
const contact_request_entity_1 = require("./contact-request.entity");
var ConversationStatus;
(function (ConversationStatus) {
    ConversationStatus["ACTIVE"] = "active";
    ConversationStatus["BLOCKED"] = "blocked";
    ConversationStatus["ARCHIVED"] = "archived";
})(ConversationStatus || (exports.ConversationStatus = ConversationStatus = {}));
let Conversation = class Conversation {
    id;
    user_a_id;
    user_a;
    user_b_id;
    user_b;
    contact_request_id;
    contact_request;
    status;
    images_enabled;
    audio_enabled;
    video_enabled;
    last_message_at;
    created_at;
    deleted_at;
    purged_at;
};
exports.Conversation = Conversation;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Conversation.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'user_a_id' }),
    __metadata("design:type", String)
], Conversation.prototype, "user_a_id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'user_a_id' }),
    __metadata("design:type", user_entity_1.User)
], Conversation.prototype, "user_a", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'user_b_id' }),
    __metadata("design:type", String)
], Conversation.prototype, "user_b_id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'user_b_id' }),
    __metadata("design:type", user_entity_1.User)
], Conversation.prototype, "user_b", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'contact_request_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], Conversation.prototype, "contact_request_id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => contact_request_entity_1.ContactRequest, { onDelete: 'SET NULL', nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'contact_request_id' }),
    __metadata("design:type", Object)
], Conversation.prototype, "contact_request", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50, default: ConversationStatus.ACTIVE }),
    __metadata("design:type", String)
], Conversation.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], Conversation.prototype, "images_enabled", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], Conversation.prototype, "audio_enabled", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], Conversation.prototype, "video_enabled", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], Conversation.prototype, "last_message_at", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Conversation.prototype, "created_at", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], Conversation.prototype, "deleted_at", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], Conversation.prototype, "purged_at", void 0);
exports.Conversation = Conversation = __decorate([
    (0, typeorm_1.Entity)('conversations')
], Conversation);
//# sourceMappingURL=conversation.entity.js.map