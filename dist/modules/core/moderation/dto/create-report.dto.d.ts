import { ReportReason } from '../entities/report.entity';
export declare class CreateReportDto {
    reported_user_id: string;
    reason: ReportReason;
    message_id?: string;
    description?: string;
}
