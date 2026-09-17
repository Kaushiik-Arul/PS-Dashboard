import {
  Injectable,
  Logger,
  OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, type QueryResult, type QueryResultRow } from 'pg';
import type { Environment } from '../config/environment';

@Injectable()
export class DatabaseService implements OnApplicationShutdown {
  private readonly logger = new Logger(DatabaseService.name);
  private readonly pool: Pool;

  constructor(config: ConfigService<Environment, true>) {
    this.pool = new Pool({
      connectionString: config.get('DATABASE_URL', { infer: true }),
      max: 5,
      connectionTimeoutMillis: 5_000,
      idleTimeoutMillis: 30_000,
      statement_timeout: 15_000,
      application_name: 'ps-dashboard-api',
    });

    this.pool.on('error', () => {
      this.logger.error('An idle PostgreSQL connection failed');
    });
  }

  query<Row extends QueryResultRow>(queryText: string): Promise<QueryResult<Row>> {
    return this.pool.query<Row>(queryText);
  }

  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }
}