import { Repository } from 'typeorm';
import { Profile } from './entities/profile.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';
export declare class ProfileService {
    private readonly profileRepo;
    constructor(profileRepo: Repository<Profile>);
    getOwnProfile(userId: string): Promise<Profile>;
    updateOwnProfile(userId: string, dto: UpdateProfileDto): Promise<Profile>;
    getPublicProfile(nickname: string): Promise<Partial<Profile>>;
}
