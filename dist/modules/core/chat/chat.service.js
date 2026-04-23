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
exports.ChatService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const user_entity_1 = require("../auth/entities/user.entity");
const contact_request_entity_1 = require("./entities/contact-request.entity");
const conversation_entity_1 = require("./entities/conversation.entity");
const message_entity_1 = require("./entities/message.entity");
let ChatService = class ChatService {
    userRepository;
    contactRequestRepository;
    conversationRepository;
    messageRepository;
    constructor(userRepository, contactRequestRepository, conversationRepository, messageRepository) {
        this.userRepository = userRepository;
        this.contactRequestRepository = contactRequestRepository;
        this.conversationRepository = conversationRepository;
        this.messageRepository = messageRepository;
    }
    async sendContactRequest(senderId, dto) {
        if (senderId === dto.receiver_id) {
            throw new common_1.BadRequestException('Anfrage an sich selbst nicht erlaubt');
        }
        const receiver = await this.userRepository.findOne({
            where: { id: dto.receiver_id, deleted_at: (0, typeorm_2.IsNull)() },
        });
        if (!receiver)
            throw new common_1.NotFoundException('Benutzer nicht gefunden');
        const existing = await this.contactRequestRepository.findOne({
            where: { sender_id: senderId, receiver_id: dto.receiver_id, status: contact_request_entity_1.ContactRequestStatus.PENDING },
        });
        if (existing)
            throw new common_1.ConflictException('Anfrage bereits gesendet');
        const request = this.contactRequestRepository.create({
            sender_id: senderId,
            receiver_id: dto.receiver_id,
            message_preview: dto.message_preview ?? null,
        });
        return this.contactRequestRepository.save(request);
    }
    async getIncomingRequests(userId) {
        return this.contactRequestRepository.find({
            where: { receiver_id: userId, status: contact_request_entity_1.ContactRequestStatus.PENDING },
            order: { created_at: 'DESC' },
        });
    }
    async getOutgoingRequests(userId) {
        return this.contactRequestRepository.find({
            where: { sender_id: userId },
            order: { created_at: 'DESC' },
        });
    }
    async acceptRequest(userId, requestId) {
        const request = await this.contactRequestRepository.findOne({
            where: { id: requestId },
        });
        if (!request)
            throw new common_1.NotFoundException('Anfrage nicht gefunden');
        if (request.receiver_id !== userId)
            throw new common_1.ForbiddenException('Keine Berechtigung');
        if (request.status !== contact_request_entity_1.ContactRequestStatus.PENDING) {
            throw new common_1.ConflictException('Anfrage ist nicht mehr ausstehend');
        }
        request.status = contact_request_entity_1.ContactRequestStatus.ACCEPTED;
        await this.contactRequestRepository.save(request);
        const conversation = this.conversationRepository.create({
            user_a_id: request.sender_id,
            user_b_id: request.receiver_id,
            contact_request_id: request.id,
        });
        return this.conversationRepository.save(conversation);
    }
    async declineRequest(userId, requestId) {
        const request = await this.contactRequestRepository.findOne({
            where: { id: requestId },
        });
        if (!request)
            throw new common_1.NotFoundException('Anfrage nicht gefunden');
        if (request.receiver_id !== userId)
            throw new common_1.ForbiddenException('Keine Berechtigung');
        if (request.status !== contact_request_entity_1.ContactRequestStatus.PENDING) {
            throw new common_1.ConflictException('Anfrage ist nicht mehr ausstehend');
        }
        await this.contactRequestRepository.update(requestId, { status: contact_request_entity_1.ContactRequestStatus.DECLINED });
        return { message: 'Anfrage abgelehnt' };
    }
    async getConversations(userId) {
        return this.conversationRepository.find({
            where: [
                { user_a_id: userId },
                { user_b_id: userId },
            ],
            order: { created_at: 'DESC' },
        });
    }
    async getConversation(userId, conversationId) {
        const conversation = await this.conversationRepository.findOne({
            where: [
                { id: conversationId, user_a_id: userId },
                { id: conversationId, user_b_id: userId },
            ],
        });
        if (!conversation)
            throw new common_1.NotFoundException('Konversation nicht gefunden');
        return conversation;
    }
    async getMessages(userId, conversationId) {
        await this.verifyConversationAccess(userId, conversationId);
        const messages = await this.messageRepository.find({
            where: { conversation_id: conversationId },
            order: { sent_at: 'ASC' },
        });
        return messages.map(msg => ({
            ...msg,
            content: msg.is_deleted ? null : msg.content,
        }));
    }
    async sendMessage(userId, conversationId, dto) {
        await this.verifyConversationAccess(userId, conversationId);
        const message = this.messageRepository.create({
            conversation_id: conversationId,
            sender_id: userId,
            content: dto.content ?? null,
            type: dto.type ?? message_entity_1.MessageType.TEXT,
        });
        return this.messageRepository.save(message);
    }
    async deleteMessage(userId, messageId) {
        const message = await this.messageRepository.findOne({
            where: { id: messageId },
        });
        if (!message)
            throw new common_1.NotFoundException('Nachricht nicht gefunden');
        if (message.sender_id !== userId)
            throw new common_1.ForbiddenException('Keine Berechtigung');
        await this.messageRepository.update(messageId, {
            is_deleted: true,
            deleted_at: new Date(),
        });
        return { message: 'Nachricht gelöscht' };
    }
    async verifyConversationAccess(userId, conversationId) {
        const conversation = await this.conversationRepository.findOne({
            where: [
                { id: conversationId, user_a_id: userId },
                { id: conversationId, user_b_id: userId },
            ],
        });
        if (!conversation)
            throw new common_1.NotFoundException('Konversation nicht gefunden');
        return conversation;
    }
};
exports.ChatService = ChatService;
exports.ChatService = ChatService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(1, (0, typeorm_1.InjectRepository)(contact_request_entity_1.ContactRequest)),
    __param(2, (0, typeorm_1.InjectRepository)(conversation_entity_1.Conversation)),
    __param(3, (0, typeorm_1.InjectRepository)(message_entity_1.Message)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], ChatService);
//# sourceMappingURL=chat.service.js.map