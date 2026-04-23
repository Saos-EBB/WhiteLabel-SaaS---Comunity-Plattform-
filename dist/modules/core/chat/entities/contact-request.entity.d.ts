import { User } from '../../auth/entities/user.entity';
export declare enum ContactRequestStatus {
    PENDING = "pending",
    ACCEPTED = "accepted",
    DECLINED = "declined"
}
export declare class ContactRequest {
    id: string;
    sender_id: string;
    sender: User;
    receiver_id: string;
    receiver: User;
    message_preview: string | null;
    status: ContactRequestStatus;
    created_at: Date;
}
