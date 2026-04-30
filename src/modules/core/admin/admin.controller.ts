import { Body, Controller, ForbiddenException, Get, Param, ParseUUIDPipe, Patch, Request, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
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

    @Get('users/:id/export')
    @UseGuards(JwtGuard, RolesGuard)
    @Roles('admin')
    exportUserData(@Param('id', ParseUUIDPipe) id: string) {
        return this.adminService.exportUserData(id);
    }
}
