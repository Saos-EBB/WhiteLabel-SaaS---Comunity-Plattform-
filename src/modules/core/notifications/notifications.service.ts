import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Notification, NotificationType } from './entities/notification.entity';
import { NotificationSettings } from './entities/notification-settings.entity';
import { UpdateNotificationSettingsDto } from './dto/update-notification-settings.dto';

@Injectable()
export class NotificationsService {
    constructor(
        @InjectRepository(Notification)
        private readonly notificationRepository: Repository<Notification>,
        @InjectRepository(NotificationSettings)
        private readonly settingsRepository: Repository<NotificationSettings>,
        private readonly eventEmitter: EventEmitter2,
        @InjectDataSource()
        private readonly dataSource: DataSource,
    ) { }

    async notifyBeefRequest(userId: string, beefId: string, tldr: string): Promise<void> {
        await this.createNotification(userId, 'beef_request', `fordert dich zum Beef heraus: "${tldr}" 🥊`, 'Beef Anfrage', beefId);
    }

    async notifyBeefAccepted(userId: string, beefId: string): Promise<void> {
        await this.createNotification(userId, 'beef_accepted', 'Hat deinen Beef angenommen! Der Kampf beginnt 💪', 'Beef angenommen', beefId);
    }

    async notifyBeefWon(userId: string, beefId: string, coinShare: number): Promise<void> {
        await this.createNotification(userId, 'beef_won', `Du hast den Beef gewonnen! 🏆 +${coinShare} Coins`, 'Beef gewonnen', beefId);
    }

    async notifyBeefLost(userId: string, beefId: string, isTie = false): Promise<void> {
        await this.createNotification(
            userId, 'beef_lost',
            isTie ? 'Unentschieden — Double KO! 💥' : 'Du hast den Beef verloren. 💀',
            isTie ? 'Beef beendet' : 'Beef verloren',
            beefId,
        );
    }

    async notifyNewMessage(userId: string, conversationId: string): Promise<void> {
        await this.createNotification(userId, 'message', 'Du hast eine neue Nachricht', 'Neue Nachricht', conversationId);
    }

    async notifyBan(userId: string, reason: string): Promise<void> {
        await this.createNotification(userId, 'ban', reason);
    }

    async createNotification(userId: string, type: NotificationType, content: string, title?: string, relatedId?: string): Promise<void> {
        const [row] = await this.dataSource.query<{ role: string }[]>(
            'SELECT role FROM users WHERE id = $1 LIMIT 1',
            [userId],
        );
        if (row?.role === 'admin') return;

        const notification = this.notificationRepository.create({
            user_id: userId,
            type,
            content,
            title: title ?? null,
            related_id: relatedId ?? null,
        });
        const saved = await this.notificationRepository.save(notification);
        this.eventEmitter.emit('notification.created', { userId, notification: saved });
    }

    async getNotifications(userId: string) {
        return this.notificationRepository.find({
            where: { user_id: userId },
            order: { is_read: 'ASC', created_at: 'DESC' },
        });
    }

    async markAsRead(userId: string, notificationId: string) {
        const notification = await this.notificationRepository.findOne({
            where: { id: notificationId },
        });

        if (!notification) throw new NotFoundException('Benachrichtigung nicht gefunden');
        if (notification.user_id !== userId) throw new ForbiddenException('Keine Berechtigung');

        if (!notification.is_read) {
            notification.is_read = true;
            await this.notificationRepository.save(notification);
        }

        return notification;
    }

    async markAllAsRead(userId: string) {
        await this.notificationRepository.update(
            { user_id: userId, is_read: false },
            { is_read: true },
        );

        return { message: 'Alle Benachrichtigungen als gelesen markiert' };
    }

    async deleteNotification(userId: string, notificationId: string): Promise<void> {
        const notification = await this.notificationRepository.findOne({
            where: { id: notificationId, user_id: userId },
        });

        if (!notification) throw new NotFoundException('Benachrichtigung nicht gefunden');

        await this.notificationRepository.remove(notification);
    }

    async getSettings(userId: string) {
        let settings = await this.settingsRepository.findOne({
            where: { user_id: userId },
        });

        if (!settings) {
            settings = this.settingsRepository.create({ user_id: userId });
            await this.settingsRepository.save(settings);
        }

        return settings;
    }

    async updateSettings(userId: string, dto: UpdateNotificationSettingsDto) {
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
}
