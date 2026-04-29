import { User } from '../../auth/entities/user.entity';
import { AgbVersion } from './agb-version.entity';
export declare class ConsentLog {
    id: string;
    user_id: string;
    user: User;
    agb_version_id: string;
    agb_version: AgbVersion;
    accepted: boolean;
    accepted_at: Date;
    ip_hash: string;
    tp_hash: string | null;
    withdrawn_at: Date | null;
    withdraw_reason: string | null;
}
