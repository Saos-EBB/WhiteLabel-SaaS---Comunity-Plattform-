import { Repository } from 'typeorm';
import { User } from '../auth/entities/user.entity';
export declare class AdminService {
    private readonly userRepo;
    constructor(userRepo: Repository<User>);
    setVulnerableFlag(userId: string, flag: boolean): Promise<Partial<User>>;
}
