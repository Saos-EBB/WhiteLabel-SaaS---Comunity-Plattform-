import { ModerationService } from './moderation.service';
import { CreateReportDto } from './dto/create-report.dto';
export declare class ModerationController {
    private readonly moderationService;
    constructor(moderationService: ModerationService);
    createReport(req: any, dto: CreateReportDto): Promise<import("./entities/report.entity").Report>;
    getReports(req: any): Promise<import("./entities/report.entity").Report[]>;
    getReport(req: any, id: string): Promise<import("./entities/report.entity").Report>;
    getStrikes(req: any): Promise<import("./entities/strike.entity").Strike[]>;
}
