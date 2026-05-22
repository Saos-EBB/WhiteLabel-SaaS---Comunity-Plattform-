import {
    Body, Controller, Delete, Get, Param, ParseIntPipe,
    ParseUUIDPipe, Patch, Post, Query, Request, UseGuards,
} from '@nestjs/common';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { AdminService } from './admin.service';
import { SetVulnerableFlagDto } from './dto/set-vulnerable-flag.dto';
import { BanUserDto } from './dto/ban-user.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { AdminCreateStrikeDto } from './dto/admin-create-strike.dto';
import { AddProfanityWordDto } from './dto/add-profanity-word.dto';
import { UpdateSettingDto } from './dto/update-setting.dto';
import { RejectMediaDto } from '../moderation/dto/reject-media.dto';

@Controller('admin')
@UseGuards(JwtGuard, RolesGuard)
@Roles('admin')
export class AdminController {
    constructor(private readonly adminService: AdminService) {}

    // ── Media moderation ───────────────────────────────────────────────────────

    @Get('media/pending')
    getMediaPending() {
        return this.adminService.getMediaPending();
    }

    @Patch('media/:id/approve')
    approveMedia(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
        return this.adminService.approveMedia(req.user.sub, id);
    }

    @Patch('media/:id/reject')
    rejectMedia(
        @Request() req: any,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: RejectMediaDto,
    ) {
        return this.adminService.rejectMedia(req.user.sub, id, dto.reason);
    }

    // ── User management ────────────────────────────────────────────────────────

    @Get('users')
    getUsers(
        @Query('role') role?: string,
        @Query('is_banned') isBanned?: string,
        @Query('search') search?: string,
        @Query('page') page = '1',
        @Query('limit') limit = '20',
    ) {
        return this.adminService.getUsers({
            role,
            is_banned: isBanned === 'true' ? true : isBanned === 'false' ? false : undefined,
            search,
            page:  Math.max(1, parseInt(page,  10) || 1),
            limit: Math.min(100, parseInt(limit, 10) || 20),
        });
    }

    @Patch('users/:id/ban')
    banUser(
        @Request() req: any,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: BanUserDto,
    ) {
        return this.adminService.banUser(req.user.sub, id, dto);
    }

    @Patch('users/:id/unban')
    unbanUser(@Param('id', ParseUUIDPipe) id: string) {
        return this.adminService.unbanUser(id);
    }

    @Patch('users/:id/role')
    setUserRole(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateUserRoleDto,
    ) {
        return this.adminService.setUserRole(id, dto);
    }

    @Patch('users/:id/vulnerable-flag')
    setVulnerableFlag(
        @Param('id') id: string,
        @Body() dto: SetVulnerableFlagDto,
    ) {
        return this.adminService.setVulnerableFlag(id, dto.vulnerable_flag);
    }

    @Get('users/:id/export')
    exportUserData(@Param('id', ParseUUIDPipe) id: string) {
        return this.adminService.exportUserData(id);
    }

    // ── Reports ────────────────────────────────────────────────────────────────

    @Get('reports')
    getReports(
        @Query('status') status?: string,
        @Query('page') page = '1',
        @Query('limit') limit = '20',
    ) {
        return this.adminService.getAdminReports({
            status,
            page:  Math.max(1, parseInt(page,  10) || 1),
            limit: Math.min(100, parseInt(limit, 10) || 20),
        });
    }

    @Patch('reports/:id')
    updateReport(
        @Request() req: any,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateReportDto,
    ) {
        return this.adminService.updateReport(req.user.sub, id, dto);
    }

    // ── Strikes ────────────────────────────────────────────────────────────────

    @Get('strikes')
    getStrikes(
        @Query('page') page = '1',
        @Query('limit') limit = '20',
    ) {
        return this.adminService.getAdminStrikes({
            page:  Math.max(1, parseInt(page,  10) || 1),
            limit: Math.min(100, parseInt(limit, 10) || 20),
        });
    }

    @Post('strikes')
    createStrike(@Request() req: any, @Body() dto: AdminCreateStrikeDto) {
        return this.adminService.createAdminStrike(req.user.sub, dto);
    }

    // ── Profanity word list ────────────────────────────────────────────────────

    @Get('profanity')
    getProfanityWords() {
        return this.adminService.getProfanityWords();
    }

    @Post('profanity')
    addProfanityWord(@Request() req: any, @Body() dto: AddProfanityWordDto) {
        return this.adminService.addProfanityWord(dto, req.user.sub);
    }

    @Delete('profanity/:word')
    removeProfanityWord(@Param('word') word: string) {
        return this.adminService.removeProfanityWord(word);
    }

    // ── System settings ────────────────────────────────────────────────────────

    @Get('settings')
    getSettings() {
        return this.adminService.getSettings();
    }

    @Patch('settings/:key')
    updateSetting(
        @Request() req: any,
        @Param('key') key: string,
        @Body() dto: UpdateSettingDto,
    ) {
        return this.adminService.updateSetting(key, dto.value, req.user.sub);
    }
}
