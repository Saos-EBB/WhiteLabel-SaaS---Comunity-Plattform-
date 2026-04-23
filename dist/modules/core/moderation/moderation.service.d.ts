import { Repository } from 'typeorm';
import { Report } from './entities/report.entity';
import { Strike } from './entities/strike.entity';
import { CreateReportDto } from './dto/create-report.dto';
export declare class ModerationService {
    private readonly reportRepository;
    private readonly strikeRepository;
    constructor(reportRepository: Repository<Report>, strikeRepository: Repository<Strike>);
    createReport(reporterId: string, dto: CreateReportDto): Promise<Report>;
    getReports(reporterId: string): Promise<Report[]>;
    getReport(reporterId: string, reportId: string): Promise<Report>;
    getStrikes(userId: string): Promise<Strike[]>;
}
