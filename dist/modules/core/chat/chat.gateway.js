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
exports.ChatGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const jwt_1 = require("@nestjs/jwt");
const conversation_entity_1 = require("./entities/conversation.entity");
const message_entity_1 = require("./entities/message.entity");
let ChatGateway = class ChatGateway {
    jwtService;
    conversationRepo;
    messageRepo;
    server;
    constructor(jwtService, conversationRepo, messageRepo) {
        this.jwtService = jwtService;
        this.conversationRepo = conversationRepo;
        this.messageRepo = messageRepo;
    }
    extractUserId(client) {
        try {
            const token = (client.handshake.auth?.token ?? client.handshake.query?.token);
            const payload = this.jwtService.verify(token);
            return payload.sub;
        }
        catch {
            return null;
        }
    }
    async handleConnection(client) {
        const userId = this.extractUserId(client);
        if (!userId) {
            client.disconnect();
            return;
        }
        const conversations = await this.conversationRepo.find({
            where: [
                { user_a_id: userId, deleted_at_a: (0, typeorm_2.IsNull)() },
                { user_b_id: userId, deleted_at_b: (0, typeorm_2.IsNull)() },
            ],
            select: ['id'],
        });
        for (const conv of conversations) {
            client.join(conv.id);
        }
    }
    async handleJoinConversation(client, conversationId) {
        conversationId = conversationId.replace(/^"|"$/g, '').trim();
        const userId = this.extractUserId(client);
        if (!userId)
            return;
        const conversation = await this.conversationRepo.findOne({
            where: [
                { id: conversationId, user_a_id: userId, deleted_at_a: (0, typeorm_2.IsNull)() },
                { id: conversationId, user_b_id: userId, deleted_at_b: (0, typeorm_2.IsNull)() },
            ],
        });
        if (!conversation)
            return;
        client.join(conversationId);
    }
    async handleSendMessage(client, data) {
        const userId = this.extractUserId(client);
        if (!userId)
            return;
        const conversation = await this.conversationRepo.findOne({
            where: [
                { id: data.conversationId, user_a_id: userId, deleted_at_a: (0, typeorm_2.IsNull)() },
                { id: data.conversationId, user_b_id: userId, deleted_at_b: (0, typeorm_2.IsNull)() },
            ],
        });
        if (!conversation)
            return;
        const message = await this.messageRepo.save(this.messageRepo.create({
            conversation_id: data.conversationId,
            sender_id: userId,
            content: data.content ?? null,
            type: data.type ?? message_entity_1.MessageType.TEXT,
        }));
        this.server.to(data.conversationId).emit('new_message', message);
    }
    handleTyping(client, conversationId) {
        const userId = this.extractUserId(client);
        if (!userId)
            return;
        client.to(conversationId).emit('user_typing', { userId, conversationId });
    }
    async handleReadMessages(client, conversationId) {
        conversationId = conversationId.replace(/^"|"$/g, '').trim();
        const userId = this.extractUserId(client);
        if (!userId)
            return;
        const conversation = await this.conversationRepo.findOne({
            where: [
                { id: conversationId, user_a_id: userId, deleted_at_a: (0, typeorm_2.IsNull)() },
                { id: conversationId, user_b_id: userId, deleted_at_b: (0, typeorm_2.IsNull)() },
            ],
        });
        if (!conversation)
            return;
        await this.messageRepo.update({ conversation_id: conversationId, sender_id: (0, typeorm_2.Not)(userId), read_at: (0, typeorm_2.IsNull)() }, { read_at: new Date() });
        this.server.to(conversationId).emit('messages_read', { userId, conversationId });
    }
};
exports.ChatGateway = ChatGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], ChatGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('join_conversation'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, String]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleJoinConversation", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('send_message'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleSendMessage", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('typing'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, String]),
    __metadata("design:returntype", void 0)
], ChatGateway.prototype, "handleTyping", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('read_messages'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, String]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleReadMessages", null);
exports.ChatGateway = ChatGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({ cors: { origin: '*' } }),
    __param(1, (0, typeorm_1.InjectRepository)(conversation_entity_1.Conversation)),
    __param(2, (0, typeorm_1.InjectRepository)(message_entity_1.Message)),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        typeorm_2.Repository,
        typeorm_2.Repository])
], ChatGateway);
//# sourceMappingURL=chat.gateway.js.map