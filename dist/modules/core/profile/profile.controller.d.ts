import { ProfileService } from './profile.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { SearchProfileDto } from './dto/search-profile.dto';
import { SubmitSensitiveDataDto } from './dto/submit-sensitive-data.dto';
export declare class ProfileController {
    private readonly profileService;
    constructor(profileService: ProfileService);
    getInterests(): Promise<import("./entities/interest.entity").Interest[]>;
    getOwnProfile(req: any): Promise<import("./entities/profile.entity").Profile>;
    updateOwnProfile(req: any, dto: UpdateProfileDto): Promise<import("./entities/profile.entity").Profile>;
    publishProfile(req: any): Promise<import("./entities/profile.entity").Profile>;
    getUserInterests(req: any): Promise<import("./entities/user-interest.entity").UserInterest[]>;
    addInterest(req: any, interestId: string): Promise<import("./entities/user-interest.entity").UserInterest[]>;
    removeInterest(req: any, interestId: string): Promise<import("./entities/user-interest.entity").UserInterest[]>;
    searchProfiles(req: any, query: SearchProfileDto): Promise<Partial<import("./entities/profile.entity").Profile>[]>;
    createSensitiveDataConsent(req: any): Promise<Partial<import("./entities/consent-log.entity").ConsentLog>>;
    submitSensitiveData(req: any, dto: SubmitSensitiveDataDto): Promise<{
        disability_visible: boolean;
        collected_at: Date;
    }>;
    blockUser(req: any, userId: string): Promise<void>;
    unblockUser(req: any, userId: string): Promise<void>;
    getPublicProfile(nickname: string): Promise<Partial<import("./entities/profile.entity").Profile>>;
}
