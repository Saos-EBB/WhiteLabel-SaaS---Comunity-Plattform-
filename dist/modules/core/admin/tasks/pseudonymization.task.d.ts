import { DataSource } from 'typeorm';
export declare class PseudonymizationTask {
    private readonly dataSource;
    private readonly logger;
    constructor(dataSource: DataSource);
    run(): Promise<void>;
}
