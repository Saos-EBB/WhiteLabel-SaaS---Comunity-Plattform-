import { AdminService } from './admin.service';
import { SetVulnerableFlagDto } from './dto/set-vulnerable-flag.dto';
export declare class AdminController {
    private readonly adminService;
    constructor(adminService: AdminService);
    setVulnerableFlag(req: any, id: string, dto: SetVulnerableFlagDto): Promise<Partial<import("../auth/entities/user.entity").User>>;
}
