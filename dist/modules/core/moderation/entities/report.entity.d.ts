import { User } from '../../auth/entities/user.entity';
export declare enum ReportReason {
    HARASSMENT = "harassment",
    SPAM = "spam",
    FAKE = "fake",
    SEXUAL = "sexual",
    ABUSE = "abuse"
}
export declare class Report {
    id: string;
    reporter_id: string;
    reporter: User;
    reported_user_id: string;
    reported_user: User;
    message_id: string | null;
    reason: ReportReason;
    description: string | null;
    status: string;
    intent_category: string | null;
    reviewed_by: string | null;
    created_at: Date;
    reviewed_at: Date | null;
    deleted_at: Date | null;
}
