import { Body, Controller, Get, Patch, Request, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { OwnerGuard } from '../../../common/guards/owner.guard';
import { SystemSettingsService } from './system-settings.service';
import { UpdatePricesDto } from './dto/update-prices.dto';

@Controller('system-settings')
export class SystemSettingsController {
    constructor(private readonly service: SystemSettingsService) {}

    @Get('prices')
    async getPrices() {
        const [monthly, yearly, lifetime] = await Promise.all([
            this.service.getString('subscription_price_monthly',  '9.99'),
            this.service.getString('subscription_price_yearly',   '49.99'),
            this.service.getString('subscription_price_lifetime', '149.99'),
        ]);
        return { monthly, yearly, lifetime };
    }

    @Patch('prices')
    @UseGuards(JwtGuard, OwnerGuard)
    async updatePrices(@Request() req: any, @Body() dto: UpdatePricesDto) {
        const adminId: string = req.user.sub;
        if (dto.monthly  !== undefined) await this.service.set('subscription_price_monthly',  dto.monthly,  adminId);
        if (dto.yearly   !== undefined) await this.service.set('subscription_price_yearly',   dto.yearly,   adminId);
        if (dto.lifetime !== undefined) await this.service.set('subscription_price_lifetime', dto.lifetime, adminId);
        const [monthly, yearly, lifetime] = await Promise.all([
            this.service.getString('subscription_price_monthly',  '9.99'),
            this.service.getString('subscription_price_yearly',   '49.99'),
            this.service.getString('subscription_price_lifetime', '149.99'),
        ]);
        return { monthly, yearly, lifetime };
    }
}
