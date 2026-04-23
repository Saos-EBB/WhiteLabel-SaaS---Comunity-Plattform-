import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { ReportReason } from '../entities/report.entity';

export class CreateReportDto {
    @IsUUID()
    reported_user_id!: string;

    @IsEnum(ReportReason)
    reason!: ReportReason;

    @IsOptional()
    @IsUUID()
    message_id?: string;

    @IsOptional()
    @IsString()
    @MaxLength(2000)
    description?: string;
}
