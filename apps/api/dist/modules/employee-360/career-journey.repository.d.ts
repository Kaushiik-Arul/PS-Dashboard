import { DatabaseService } from '../../database/database.service';
import type { CareerJourneyEvent, CareerJourneyInput } from './career-journey.types';
export declare class CareerJourneyRepository {
    private readonly database;
    constructor(database: DatabaseService);
    list(persNo: string): Promise<CareerJourneyEvent[]>;
    create(persNo: string, input: CareerJourneyInput, actorAccountId: string): Promise<CareerJourneyEvent>;
    update(id: string, persNo: string, input: CareerJourneyInput, actorAccountId: string): Promise<CareerJourneyEvent | null>;
    delete(id: string, persNo: string, actorAccountId: string): Promise<boolean>;
    private findForUpdate;
    private audit;
}
