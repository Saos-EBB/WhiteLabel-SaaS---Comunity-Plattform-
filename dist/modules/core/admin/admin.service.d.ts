import { DataSource, Repository } from 'typeorm';
import { User } from '../auth/entities/user.entity';
export declare class AdminService {
    private readonly userRepo;
    private readonly dataSource;
    constructor(userRepo: Repository<User>, dataSource: DataSource);
    setVulnerableFlag(userId: string, flag: boolean): Promise<Partial<User>>;
    exportUserData(userId: string): Promise<{
        user: {
            id: string;
            role: string;
            is_verified: boolean;
            is_banned: boolean;
            ban_reason: string | null;
            ban_expires_at: Date | null;
            vulnerable_flag: boolean;
            created_at: Date;
            last_login: Date | null;
            deleted_at: Date | null;
            pseudonymized_at: Date | null;
            email_verified_at: Date | null;
        };
        profiles: any;
        user_interests: any;
        profile_sensitive_data: any;
        consent_logs: any;
        refresh_tokens: any;
        subscriptions: any;
        payment_logs: any;
        notifications: any;
        reports_submitted: any;
        reports_received: any;
        strikes: any;
        blocks_given: any;
        blocks_received: any;
        contact_requests_sent: any;
        contact_requests_received: any;
        media_uploads: any;
        vulnerable_flag_audit: any;
    }>;
}
