import { Controller, Get, Patch, Put, Body, Param, Request, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { UpdateNotificationSettingsDto } from './dto/update-notification-settings.dto';

@Controller('notifications')
@UseGuards(JwtGuard)
export class NotificationsController {
    constructor(private readonly notificationsService: NotificationsService) { }

    @Get()
    getNotifications(@Request() req: any) {
        return this.notificationsService.getNotifications(req.user.sub);
    }

    @Patch('read-all')
    markAllAsRead(@Request() req: any) {
        return this.notificationsService.markAllAsRead(req.user.sub);
    }

    @Patch(':id/read')
    markAsRead(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
        return this.notificationsService.markAsRead(req.user.sub, id);
    }

    @Get('settings')
    getSettings(@Request() req: any) {
        return this.notificationsService.getSettings(req.user.sub);
    }

    @Put('settings')
    updateSettings(@Request() req: any, @Body() dto: UpdateNotificationSettingsDto) {
        return this.notificationsService.updateSettings(req.user.sub, dto);
    }
}
