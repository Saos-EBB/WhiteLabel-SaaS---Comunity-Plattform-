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
exports.NotificationsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const notification_entity_1 = require("./entities/notification.entity");
const notification_settings_entity_1 = require("./entities/notification-settings.entity");
let NotificationsService = class NotificationsService {
    notificationRepository;
    settingsRepository;
    constructor(notificationRepository, settingsRepository) {
        this.notificationRepository = notificationRepository;
        this.settingsRepository = settingsRepository;
    }
    async getNotifications(userId) {
        return this.notificationRepository.find({
            where: { user_id: userId },
            order: { is_read: 'ASC', created_at: 'DESC' },
        });
    }
    async markAsRead(userId, notificationId) {
        const notification = await this.notificationRepository.findOne({
            where: { id: notificationId },
        });
        if (!notification)
            throw new common_1.NotFoundException('Benachrichtigung nicht gefunden');
        if (notification.user_id !== userId)
            throw new common_1.ForbiddenException('Keine Berechtigung');
        if (!notification.is_read) {
            notification.is_read = true;
            await this.notificationRepository.save(notification);
        }
        return notification;
    }
    async markAllAsRead(userId) {
        await this.notificationRepository.update({ user_id: userId, is_read: false }, { is_read: true });
        return { message: 'Alle Benachrichtigungen als gelesen markiert' };
    }
    async getSettings(userId) {
        let settings = await this.settingsRepository.findOne({
            where: { user_id: userId },
        });
        if (!settings) {
            settings = this.settingsRepository.create({ user_id: userId });
            await this.settingsRepository.save(settings);
        }
        return settings;
    }
    async updateSettings(userId, dto) {
        let settings = await this.settingsRepository.findOne({
            where: { user_id: userId },
        });
        if (!settings) {
            settings = this.settingsRepository.create({ user_id: userId });
        }
        Object.assign(settings, dto);
        settings.updated_at = new Date();
        return this.settingsRepository.save(settings);
    }
};
exports.NotificationsService = NotificationsService;
exports.NotificationsService = NotificationsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(notification_entity_1.Notification)),
    __param(1, (0, typeorm_1.InjectRepository)(notification_settings_entity_1.NotificationSettings)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], NotificationsService);
//# sourceMappingURL=notifications.service.js.map