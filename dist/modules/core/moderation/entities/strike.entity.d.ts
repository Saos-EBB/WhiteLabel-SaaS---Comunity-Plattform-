import { User } from '../../auth/entities/user.entity';
export declare class Strike {
    id: string;
    user_id: string;
    user: User;
    report_id: string | null;
    issued_by: string;
    type: string;
    reason: string | null;
    expires_at: Date | null;
    ban_lifted_at: Date | null;
    lifted_by_job: boolean;
    created_at: Date;
}
