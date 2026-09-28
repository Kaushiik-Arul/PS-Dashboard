import { Injectable } from '@nestjs/common';
import type { PoolClient } from 'pg';
import { DatabaseService } from '../../../database/database.service';
import type {
  JobDescription,
  JobDescriptionInput,
  JobDescriptionPage,
} from './job-descriptions.types';

type JobDescriptionRow = {
  job_description_id: string;
  jd_id: string;
  role_title: string;
  updated_at: Date | string;
};

function mapRow(row: JobDescriptionRow): JobDescription {
  return {
    id: row.job_description_id,
    jdId: row.jd_id,
    roleTitle: row.role_title,
    updatedAt: row.updated_at instanceof Date
      ? row.updated_at.toISOString()
      : new Date(row.updated_at).toISOString(),
  };
}

const selectedColumns = 'job_description_id, jd_id, role_title, updated_at';

@Injectable()
export class JobDescriptionsRepository {
  constructor(private readonly database: DatabaseService) {}

  async list(search: string, page: number, pageSize: number): Promise<JobDescriptionPage> {
    const predicate = `WHERE ($1::TEXT = ''
      OR STRPOS(LOWER(jd_id), LOWER($1)) > 0
      OR STRPOS(LOWER(role_title), LOWER($1)) > 0)`;
    const [items, count] = await Promise.all([
      this.database.query<JobDescriptionRow>(
        `SELECT ${selectedColumns}
         FROM public.job_descriptions
         ${predicate}
         ORDER BY LOWER(jd_id), jd_id
         LIMIT $2 OFFSET $3`,
        [search, pageSize, (page - 1) * pageSize],
      ),
      this.database.query<{ count: string }>(
        `SELECT COUNT(*)::TEXT AS count
         FROM public.job_descriptions
         ${predicate}`,
        [search],
      ),
    ]);
    return {
      items: items.rows.map(mapRow),
      total: Number(count.rows[0]?.count ?? 0),
      page,
      pageSize,
      search,
    };
  }

  create(input: JobDescriptionInput, actorAccountId: string): Promise<JobDescription> {
    return this.database.transaction(async (client) => {
      const result = await client.query<JobDescriptionRow>(
        `INSERT INTO public.job_descriptions (
           jd_id, role_title, created_by_account_id, updated_by_account_id
         ) VALUES ($1, $2, $3, $3)
         RETURNING ${selectedColumns}`,
        [input.jdId, input.roleTitle, actorAccountId],
      );
      const created = mapRow(result.rows[0]);
      await this.audit(client, 'job_description_created', actorAccountId, { jobDescription: created });
      return created;
    });
  }

  importCsv(inputs: JobDescriptionInput[], fileName: string, actorAccountId: string): Promise<{ totalRows: number; created: number; updated: number; unchanged: number }> {
    return this.database.transaction(async (client) => {
      await client.query(`SELECT PG_ADVISORY_XACT_LOCK(HASHTEXT('job_descriptions_import'))`);
      const existing = await client.query<{ jd_id: string; role_title: string }>(
        `SELECT jd_id, role_title FROM public.job_descriptions
         WHERE jd_id = ANY($1::TEXT[])`,
        [inputs.map((input) => input.jdId)],
      );
      const existingTitles = new Map(existing.rows.map((row) => [row.jd_id, row.role_title]));
      const updated = inputs.filter((input) => {
        const existingTitle = existingTitles.get(input.jdId);
        return existingTitle !== undefined && existingTitle !== input.roleTitle;
      }).length;
      await client.query(
        `INSERT INTO public.job_descriptions (
           jd_id, role_title, created_by_account_id, updated_by_account_id
         )
         SELECT item.jd_id, item.role_title, $2, $2
         FROM JSONB_TO_RECORDSET($1::JSONB) AS item(jd_id TEXT, role_title TEXT)
         ON CONFLICT (jd_id) DO UPDATE SET
           role_title = EXCLUDED.role_title,
           updated_by_account_id = EXCLUDED.updated_by_account_id,
           updated_at = CURRENT_TIMESTAMP
         WHERE job_descriptions.role_title IS DISTINCT FROM EXCLUDED.role_title`,
        [JSON.stringify(inputs.map((input) => ({ jd_id: input.jdId, role_title: input.roleTitle }))), actorAccountId],
      );
      const summary = {
        totalRows: inputs.length,
        created: inputs.length - existingTitles.size,
        updated,
        unchanged: existingTitles.size - updated,
      };
      await this.audit(client, 'job_description_updated', actorAccountId, {
        operation: 'csv_import',
        fileName,
        ...summary,
      });
      return summary;
    });
  }

  update(id: string, input: JobDescriptionInput, actorAccountId: string): Promise<JobDescription | null> {
    return this.database.transaction(async (client) => {
      const previous = await this.findForUpdate(client, id);
      if (!previous) return null;
      const result = await client.query<JobDescriptionRow>(
        `UPDATE public.job_descriptions
         SET jd_id = $2, role_title = $3, updated_by_account_id = $4,
             updated_at = CURRENT_TIMESTAMP
         WHERE job_description_id = $1
         RETURNING ${selectedColumns}`,
        [id, input.jdId, input.roleTitle, actorAccountId],
      );
      const updated = mapRow(result.rows[0]);
      await this.audit(client, 'job_description_updated', actorAccountId, {
        previous: mapRow(previous),
        jobDescription: updated,
      });
      return updated;
    });
  }

  delete(id: string, actorAccountId: string): Promise<boolean> {
    return this.database.transaction(async (client) => {
      const previous = await this.findForUpdate(client, id);
      if (!previous) return false;
      await client.query(
        'DELETE FROM public.job_descriptions WHERE job_description_id = $1',
        [id],
      );
      await this.audit(client, 'job_description_deleted', actorAccountId, {
        jobDescription: mapRow(previous),
      });
      return true;
    });
  }

  private async findForUpdate(client: PoolClient, id: string): Promise<JobDescriptionRow | null> {
    const result = await client.query<JobDescriptionRow>(
      `SELECT ${selectedColumns}
       FROM public.job_descriptions
       WHERE job_description_id = $1
       FOR UPDATE`,
      [id],
    );
    return result.rows[0] ?? null;
  }

  private audit(client: PoolClient, eventType: string, actorAccountId: string, details: Record<string, unknown>) {
    return client.query(
      `INSERT INTO public.security_audit_log (event_type, actor_account_id, event_details)
       VALUES ($1, $2, $3)`,
      [eventType, actorAccountId, details],
    );
  }
}