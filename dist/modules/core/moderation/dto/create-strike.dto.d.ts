export declare enum StrikeType {
    WARNING = "warning",
    TEMP = "temp",
    PERMANENT = "permanent"
}
export declare class CreateStrikeDto {
    user_id: string;
    report_id: string;
    type: StrikeType;
    reason: string;
    expires_at?: Date;
}
