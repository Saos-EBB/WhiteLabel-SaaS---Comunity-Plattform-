import {
    Body,
    Controller,
    Get,
    Param,
    Put,
    Request,
    UseGuards,
} from '@nestjs/common';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { ProfileService } from './profile.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@UseGuards(JwtGuard)
@Controller('profile')
export class ProfileController {
    constructor(private readonly profileService: ProfileService) {}

    @Get('me')
    getOwnProfile(@Request() req: any) {
        return this.profileService.getOwnProfile(req.user.sub);
    }

    @Put('me')
    updateOwnProfile(@Request() req: any, @Body() dto: UpdateProfileDto) {
        return this.profileService.updateOwnProfile(req.user.sub, dto);
    }

    @Get(':nickname')
    getPublicProfile(@Param('nickname') nickname: string) {
        return this.profileService.getPublicProfile(nickname);
    }
}
