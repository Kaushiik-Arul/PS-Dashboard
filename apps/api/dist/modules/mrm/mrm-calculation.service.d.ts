import { MrmCalculationRepository } from './mrm-calculation.repository';
import type { MrmCalculation } from './mrm.types';
export declare class MrmCalculationService {
    private readonly repository;
    constructor(repository: MrmCalculationRepository);
    getSourceStatus(dataMonth: string): Promise<import("./mrm.types").MrmSourceStatus>;
    calculate(dataMonth: string, accountId: string): Promise<MrmCalculation>;
    private buildBuckets;
}
