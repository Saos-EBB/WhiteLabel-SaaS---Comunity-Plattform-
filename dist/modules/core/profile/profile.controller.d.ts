import { ProfileService } from './profile.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
export declare class ProfileController {
    private readonly profileService;
    constructor(profileService: ProfileService);
    getOwnProfile(req: any): Promise<import("./entities/profile.entity").Profile>;
    updateOwnProfile(req: any, dto: UpdateProfileDto): Promise<import("./entities/profile.entity").Profile>;
    getPublicProfile(nickname: string): Promise<Partial<import("./entities/profile.entity").Profile>>;
}
