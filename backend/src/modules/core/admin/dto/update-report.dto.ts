import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export enum AdminReportStatus {
    REVIEWED = 'reviewed',
    CLOSED   = 'closed',
}

export class UpdateReportDto {
    @IsEnum(AdminReportStatus)
    status!: AdminReportStatus;

    @IsOptional()
    @IsString()
    @MaxLength(2000)
    note?: string;
}
