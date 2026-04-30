export declare class User {
    id: string;
    email_search_hash: string | null;
    password_hash: string | null;
    google_id_hash: string | null;
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
    email_verification_token: string | null;
    email_verification_expires_at: Date | null;
    password_reset_token: string | null;
    password_reset_expires_at: Date | null;
    email: Buffer | null;
}
