import { User } from '../../auth/entities/user.entity';
import { ConsentLog } from './consent-log.entity';
export declare class ProfileSensitiveData {
    id: string;
    user_id: string;
    user: User;
    consent_id: string;
    consent: ConsentLog;
    disability_type: Buffer | null;
    disability_visible: boolean;
    collected_at: Date;
    updated_at: Date;
}
