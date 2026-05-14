import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { AdminService } from './admin.service';
import { SetVulnerableFlagDto } from './dto/set-vulnerable-flag.dto';

@Controller('admin')
export class AdminController {
    constructor(private readonly adminService: AdminService) {}

    @Patch('users/:id/vulnerable-flag')
    @UseGuards(JwtGuard, RolesGuard)
    @Roles('admin')
    setVulnerableFlag(
        @Param('id') id: string,
        @Body() dto: SetVulnerableFlagDto,
    ) {
        return this.adminService.setVulnerableFlag(id, dto.vulnerable_flag);
    }

    @Get('users/:id/export')
    @UseGuards(JwtGuard, RolesGuard)
    @Roles('admin')
    exportUserData(@Param('id', ParseUUIDPipe) id: string) {
        return this.adminService.exportUserData(id);
    }
}
