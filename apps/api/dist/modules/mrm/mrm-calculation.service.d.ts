import { MrmCalculationRepository, type MrmQueryExecutor } from './mrm-calculation.repository';
import type { MrmCalculation } from './mrm.types';
export declare class MrmCalculationService {
    private readonly repository;
    constructor(repository: MrmCalculationRepository);
    getSourceStatus(dataMonth: string, executor?: MrmQueryExecutor): Promise<import("./mrm.types").MrmSourceStatus>;
    calculate(dataMonth: string, accountId: string, executor?: MrmQueryExecutor): Promise<MrmCalculation>;
    archiveMonth(dataMonth: string, accountId: string, executor: MrmQueryExecutor): Promise<void>;
    private buildBuckets;
}
