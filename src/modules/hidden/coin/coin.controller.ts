import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { CoinService } from './coin.service';
import { JwtGuard } from '../../../common/guards/jwt.guard';

@Controller('hidden/coin')
@UseGuards(JwtGuard)
export class CoinController {
    constructor(private readonly coinService: CoinService) { }

    @Get('balance')
    getBalance(@Request() req: any) {
        return this.coinService.getBalance(req.user.sub);
    }
}
