import { Body, Controller, ForbiddenException, Param, Patch, Request, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { AdminService } from './admin.service';
import { SetVulnerableFlagDto } from './dto/set-vulnerable-flag.dto';

@Controller('admin')
export class AdminController {
    constructor(private readonly adminService: AdminService) {}

    @Patch('users/:id/vulnerable-flag')
    @UseGuards(JwtGuard)
    setVulnerableFlag(
        @Request() req: any,
        @Param('id') id: string,
        @Body() dto: SetVulnerableFlagDto,
    ) {
        if (req.user.role !== 'admin') throw new ForbiddenException('Nur Admins erlaubt');
        return this.adminService.setVulnerableFlag(id, dto.vulnerable_flag);
    }
}
