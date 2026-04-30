import { Repository } from 'typeorm';
import { Report } from './entities/report.entity';
import { Strike } from './entities/strike.entity';
import { User } from '../auth/entities/user.entity';
import { CreateReportDto } from './dto/create-report.dto';
import { CreateReviewDto } from './dto/create-review.dto';
import { CreateStrikeDto } from './dto/create-strike.dto';
export declare class ModerationService {
    private readonly reportRepository;
    private readonly strikeRepository;
    private readonly userRepository;
    constructor(reportRepository: Repository<Report>, strikeRepository: Repository<Strike>, userRepository: Repository<User>);
    createReport(reporterId: string, dto: CreateReportDto): Promise<Report>;
    getReports(reporterId: string): Promise<Report[]>;
    getReport(reporterId: string, reportId: string): Promise<Report>;
    getStrikes(userId: string): Promise<Strike[]>;
    createStrike(adminId: string, dto: CreateStrikeDto): Promise<Strike>;
    reviewReport(adminId: string, reportId: string, dto: CreateReviewDto): Promise<Report>;
}
