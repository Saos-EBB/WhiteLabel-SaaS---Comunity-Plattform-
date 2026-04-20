export declare class User {
    id: string;
    email_search_hash: string | null;
    password_hash: string | null;
    google_id_hash: string | null;
    role: string;
    is_verified: boolean;
    is_banned: boolean;
    vulnerable_flag: boolean;
    created_at: Date;
    deleted_at: Date | null;
    pseudonymized_at: Date | null;
}
