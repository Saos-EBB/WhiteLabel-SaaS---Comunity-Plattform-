import { NotificationsService } from './notifications.service';
import { UpdateNotificationSettingsDto } from './dto/update-notification-settings.dto';
export declare class NotificationsController {
    private readonly notificationsService;
    constructor(notificationsService: NotificationsService);
    getNotifications(req: any): Promise<import("./entities/notification.entity").Notification[]>;
    markAllAsRead(req: any): Promise<{
        message: string;
    }>;
    markAsRead(req: any, id: string): Promise<import("./entities/notification.entity").Notification>;
    getSettings(req: any): Promise<import("./entities/notification-settings.entity").NotificationSettings>;
    updateSettings(req: any, dto: UpdateNotificationSettingsDto): Promise<import("./entities/notification-settings.entity").NotificationSettings>;
}
