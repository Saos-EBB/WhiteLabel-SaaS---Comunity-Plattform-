export declare enum AgbType {
    AGB = "agb",
    PRIVACY = "privacy",
    SENSITIVE_DATA = "sensitive_data"
}
export declare class AgbVersion {
    id: string;
    version: string;
    type: AgbType;
    content_normal: string;
    content_simple: string;
    content_url: string | null;
    valid_from: Date;
    valid_until: Date | null;
    is_current: boolean;
}
