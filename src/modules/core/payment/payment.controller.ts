import { Controller, Get, Post, Delete, Body, Param, Request, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';

@Controller('payment')
@UseGuards(JwtGuard)
export class PaymentController {
    constructor(private readonly paymentService: PaymentService) { }

    @Get('subscriptions')
    getActiveSubscription(@Request() req: any) {
        return this.paymentService.getActiveSubscription(req.user.sub);
    }

    @Post('subscriptions')
    createSubscription(@Request() req: any, @Body() dto: CreateSubscriptionDto) {
        return this.paymentService.createSubscription(req.user.sub, dto);
    }

    @Delete('subscriptions/:id')
    cancelSubscription(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
        return this.paymentService.cancelSubscription(req.user.sub, id);
    }

    @Get('logs')
    getPaymentLogs(@Request() req: any) {
        return this.paymentService.getPaymentLogs(req.user.sub);
    }
}
