import { IsEnum, IsOptional } from 'class-validator';

export enum ReviewStatus {
    REVIEWED = 'reviewed',
    CLOSED = 'closed',
}

export enum IntentCategory {
    MISTAKE = 'mistake',
    REPEAT = 'repeat',
    MALICIOUS = 'malicious',
}

export class CreateReviewDto {
    @IsEnum(ReviewStatus)
    status!: ReviewStatus;

    @IsOptional()
    @IsEnum(IntentCategory)
    intent_category?: IntentCategory;
}
