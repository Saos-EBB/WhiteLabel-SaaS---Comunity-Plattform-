export declare enum ReviewStatus {
    REVIEWED = "reviewed",
    CLOSED = "closed"
}
export declare enum IntentCategory {
    MISTAKE = "mistake",
    REPEAT = "repeat",
    MALICIOUS = "malicious"
}
export declare class CreateReviewDto {
    status: ReviewStatus;
    intent_category?: IntentCategory;
}
