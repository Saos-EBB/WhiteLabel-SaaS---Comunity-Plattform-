import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    Put,
    Request,
    UseGuards,
    Query
} from '@nestjs/common';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { ProfileService } from './profile.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { SearchProfileDto } from './dto/search-profile.dto';
import { SubmitSensitiveDataDto } from './dto/submit-sensitive-data.dto';

@Controller('profile')
export class ProfileController {
    constructor(private readonly profileService: ProfileService) { }

    @Get('interests')
    getInterests() {
        return this.profileService.getInterests();
    }

    @Get('me')
    @UseGuards(JwtGuard)
    getOwnProfile(@Request() req: any) {
        return this.profileService.getOwnProfileWithPhoto(req.user.sub);
    }

    @Put('me')
    @UseGuards(JwtGuard)
    updateOwnProfile(@Request() req: any, @Body() dto: UpdateProfileDto) {
        return this.profileService.updateOwnProfile(req.user.sub, dto);
    }

    @Patch('me/publish')
    @UseGuards(JwtGuard)
    publishProfile(@Request() req: any) {
        return this.profileService.publishProfile(req.user.sub);
    }

    @Get('me/interests')
    @UseGuards(JwtGuard)
    getUserInterests(@Request() req: any) {
        return this.profileService.getUserInterests(req.user.sub);
    }

    @Post('me/interests/:interestId')
    @UseGuards(JwtGuard)
    addInterest(@Request() req: any, @Param('interestId') interestId: string) {
        return this.profileService.addInterest(req.user.sub, interestId);
    }

    @Delete('me/interests/:interestId')
    @UseGuards(JwtGuard)
    removeInterest(@Request() req: any, @Param('interestId') interestId: string) {
        return this.profileService.removeInterest(req.user.sub, interestId);
    }


    @Get('search')
    @UseGuards(JwtGuard)
    searchProfiles(@Request() req: any, @Query() query: SearchProfileDto) {
        return this.profileService.searchProfiles(
            req.user.sub,
            query.city,
            query.interests,
            query.gender,
            query.looking_for,
            query.min_age,
            query.max_age,
            query.online_only,
        );
    }


    @Post('me/consent/sensitive-data')
    @UseGuards(JwtGuard)
    createSensitiveDataConsent(@Request() req: any) {
        const ip = req.ip ?? '0.0.0.0';
        return this.profileService.createSensitiveDataConsent(req.user.sub, ip);
    }

    @Post('me/sensitive-data')
    @UseGuards(JwtGuard)
    submitSensitiveData(@Request() req: any, @Body() dto: SubmitSensitiveDataDto) {
        return this.profileService.submitSensitiveData(req.user.sub, dto);
    }

    @Post('me/block/:userId')
    @UseGuards(JwtGuard)
    blockUser(@Request() req: any, @Param('userId') userId: string) {
        return this.profileService.blockUser(req.user.sub, userId);
    }

    @Delete('me/block/:userId')
    @UseGuards(JwtGuard)
    unblockUser(@Request() req: any, @Param('userId') userId: string) {
        return this.profileService.unblockUser(req.user.sub, userId);
    }

    @Get('user/:userId')
    @UseGuards(JwtGuard)
    getProfileByUserId(@Param('userId') userId: string) {
        return this.profileService.getProfileByUserId(userId);
    }

    @Get(':nickname/interests')
    getPublicProfileInterests(@Param('nickname') nickname: string) {
        return this.profileService.getPublicProfileInterests(nickname);
    }

    @Get(':nickname')
    getPublicProfile(@Param('nickname') nickname: string) {
        return this.profileService.getPublicProfile(nickname);
    }

}