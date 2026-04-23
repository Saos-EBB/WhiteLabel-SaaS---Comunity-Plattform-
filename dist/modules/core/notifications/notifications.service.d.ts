import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { NotificationSettings } from './entities/notification-settings.entity';
import { UpdateNotificationSettingsDto } from './dto/update-notification-settings.dto';
export declare class NotificationsService {
    private readonly notificationRepository;
    private readonly settingsRepository;
    constructor(notificationRepository: Repository<Notification>, settingsRepository: Repository<NotificationSettings>);
    getNotifications(userId: string): Promise<Notification[]>;
    markAsRead(userId: string, notificationId: string): Promise<Notification>;
    markAllAsRead(userId: string): Promise<{
        message: string;
    }>;
    getSettings(userId: string): Promise<NotificationSettings>;
    updateSettings(userId: string, dto: UpdateNotificationSettingsDto): Promise<NotificationSettings>;
}
