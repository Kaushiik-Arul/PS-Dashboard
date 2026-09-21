import { OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type PoolClient, type QueryResult, type QueryResultRow } from 'pg';
import type { Environment } from '../config/environment';
export declare class DatabaseService implements OnApplicationShutdown {
    private readonly logger;
    private readonly pool;
    constructor(config: ConfigService<Environment, true>);
    query<Row extends QueryResultRow>(queryText: string, values?: unknown[]): Promise<QueryResult<Row>>;
    transaction<Result>(operation: (client: PoolClient) => Promise<Result>): Promise<Result>;
    onApplicationShutdown(): Promise<void>;
}
