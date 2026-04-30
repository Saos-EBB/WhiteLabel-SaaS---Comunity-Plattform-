import { ModerationService } from './moderation.service';
import { CreateReportDto } from './dto/create-report.dto';
import { CreateReviewDto } from './dto/create-review.dto';
import { CreateStrikeDto } from './dto/create-strike.dto';
export declare class ModerationController {
    private readonly moderationService;
    constructor(moderationService: ModerationService);
    createReport(req: any, dto: CreateReportDto): Promise<import("./entities/report.entity").Report>;
    getReports(req: any): Promise<import("./entities/report.entity").Report[]>;
    getReport(req: any, id: string): Promise<import("./entities/report.entity").Report>;
    createStrike(req: any, dto: CreateStrikeDto): Promise<import("./entities/strike.entity").Strike>;
    getStrikes(req: any): Promise<import("./entities/strike.entity").Strike[]>;
    reviewReport(req: any, id: string, dto: CreateReviewDto): Promise<import("./entities/report.entity").Report>;
}
