import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { PoolClient } from 'pg';
import { DatabaseService } from '../../../database/database.service';
import {
  cleanSuccessionPlanningValues,
  parseSuccessionPlanningFile,
  validateSuccessionPlanningRows,
} from './succession-planning-import.parser';
import {
  successionPlanningColumns,
  type SuccessionPlanningFile,
  type SuccessionPlanningValues,
} from './succession-planning-import.types';

@Injectable()
export class SuccessionPlanningImportService {
  constructor(private readonly database: DatabaseService) {}

  private uuid(id: string) {
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        id,
      )
    )
      throw new BadRequestException('Invalid preview ID.');
  }

  private async jdLookup(client: PoolClient, values: string[]) {
    const suffixes = [
      ...new Set(
        values
          .filter((value) => value.length >= 3)
          .map((value) => value.slice(-3).toLocaleLowerCase('en-US')),
      ),
    ];
    const matches = new Map<string, string>();
    const ambiguousSuffixes = new Set<string>();
    if (!suffixes.length) return { matches, ambiguousSuffixes };
    const result = await client.query<{ jd_id: string }>(
      `SELECT jd_id FROM public.job_descriptions
       WHERE LOWER(RIGHT(jd_id, 3)) = ANY($1::TEXT[])`,
      [suffixes],
    );
    for (const row of result.rows) {
      const suffix = row.jd_id.slice(-3).toLocaleLowerCase('en-US');
      if (matches.has(suffix)) ambiguousSuffixes.add(suffix);
      else matches.set(suffix, row.jd_id);
    }
    ambiguousSuffixes.forEach((suffix) => matches.delete(suffix));
    return { matches, ambiguousSuffixes };
  }

  private async lockState(client: PoolClient) {
    const result = await client.query<{ revision: string }>(
      `SELECT revision::TEXT AS revision
       FROM public.succession_planning_state
       WHERE singleton = TRUE FOR UPDATE`,
    );
    return result.rows[0].revision;
  }

  private async previewLock(client: PoolClient, actor: string, id: string) {
    this.uuid(id);
    const result = await client.query<{
      file_name: string;
      file_hash: string;
      base_revision: string;
    }>(
      `SELECT file_name, file_hash, base_revision::TEXT AS base_revision
       FROM public.succession_planning_previews
       WHERE id = $1 AND uploaded_by = $2 AND status = 'ready'
         AND expires_at > CURRENT_TIMESTAMP
       FOR UPDATE`,
      [id, actor],
    );
    if (!result.rows[0])
      throw new NotFoundException(
        'Preview expired or was not found. Upload the workbook again.',
      );
    return result.rows[0];
  }

  private async validatedRows(client: PoolClient, id: string) {
    const found = await client.query<{
      row_number: number;
      row_data: SuccessionPlanningValues;
    }>(
      `SELECT row_number, row_data
       FROM public.succession_planning_preview_rows
       WHERE preview_id = $1 ORDER BY row_number`,
      [id],
    );
    const rows = found.rows.map((row) => ({
      rowNumber: row.row_number,
      values: row.row_data,
      issues: [],
    }));
    const jdIds = rows.flatMap((row) => [
      row.values.position_jd_id,
      row.values.successor1_current_jd_id,
      row.values.successor2_current_jd_id,
    ]);
    return validateSuccessionPlanningRows(
      rows,
      await this.jdLookup(client, jdIds),
    );
  }

  async upload(actor: string, file?: SuccessionPlanningFile) {
    if (!file)
      throw new BadRequestException(
        'Choose a Succession Planning XLSX workbook.',
      );
    if (file.buffer.length > 50 * 1024 * 1024)
      throw new BadRequestException('File exceeds 50 MB.');
    const rows = await parseSuccessionPlanningFile(file);
    return this.database.transaction(async (client) => {
      const revision = await this.lockState(client);
      const preview = await client.query<{ id: string }>(
        `INSERT INTO public.succession_planning_previews
           (base_revision, uploaded_by, file_name, file_hash)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [
          revision,
          actor,
          file.originalname,
          createHash('sha256').update(file.buffer).digest('hex'),
        ],
      );
      const id = preview.rows[0].id;
      await client.query(
        `INSERT INTO public.succession_planning_preview_rows
           (preview_id, row_number, row_data)
         SELECT $1, item.row_number, item.row_data
         FROM JSONB_TO_RECORDSET($2::JSONB) AS item(
           row_number INTEGER, row_data JSONB
         )`,
        [
          id,
          JSON.stringify(
            rows.map((row) => ({
              row_number: row.rowNumber,
              row_data: row.values,
            })),
          ),
        ],
      );
      return { id };
    });
  }

  async preview(
    actor: string,
    id: string,
    filter = 'all',
    pageInput = '1',
  ) {
    if (!['all', 'warnings'].includes(filter))
      throw new BadRequestException('Invalid preview filter.');
    if (!/^[1-9]\d{0,4}$/.test(pageInput))
      throw new BadRequestException('Invalid preview page.');
    return this.database.transaction(async (client) => {
      const preview = await this.previewLock(client, actor, id);
      const rows = await this.validatedRows(client, id);
      const warningsByEmployee = new Map<string, (typeof rows)[number]>();
      const warningSummariesByEmployee = new Map<
        string,
        {
          employeeNumber: string;
          employeeName: string;
          occurrences: number;
          assignments: Array<{
            rowNumber: number;
            successor: 1 | 2;
            area: string;
            positionJdId: string;
            jdName: string;
            deptCode: string;
            currentJdId: string;
            readiness: string;
            rating: string;
            idpStatus: string;
          }>;
        }
      >();
      for (const row of rows) {
        for (const issue of row.issues) {
          const employeeNumber = issue.employeeNumber;
          if (!warningsByEmployee.has(employeeNumber))
            warningsByEmployee.set(employeeNumber, { ...row, issues: [issue] });
          const successor = issue.column === 'successor1_pers_no' ? 1 : 2;
          const employeeName =
            successor === 1
              ? row.values.successor1_name
              : row.values.successor2_name;
          const summary = warningSummariesByEmployee.get(employeeNumber) ?? {
            employeeNumber,
            employeeName,
            occurrences: issue.occurrences,
            assignments: [],
          };
          if (!summary.employeeName && employeeName)
            summary.employeeName = employeeName;
          summary.assignments.push({
            rowNumber: row.rowNumber,
            successor,
            area: row.values.area,
            positionJdId: row.values.position_jd_id,
            jdName: row.values.jd_name,
            deptCode:
              successor === 1
                ? row.values.successor1_dept_code
                : row.values.successor2_dept_code,
            currentJdId:
              successor === 1
                ? row.values.successor1_current_jd_id
                : row.values.successor2_current_jd_id,
            readiness:
              successor === 1
                ? row.values.successor1_readiness
                : row.values.successor2_readiness,
            rating:
              successor === 1
                ? row.values.successor1_9_box_rating
                : row.values.successor2_9_box_rating,
            idpStatus:
              successor === 1
                ? row.values.successor1_idp_status
                : row.values.successor2_idp_status,
          });
          warningSummariesByEmployee.set(employeeNumber, summary);
        }
      }
      const warningRows = warningsByEmployee.size;
      const warningSummaries = [...warningSummariesByEmployee.values()];
      const selected =
        filter === 'warnings' ? [...warningsByEmployee.values()] : rows;
      const page = Math.min(
        Number(pageInput),
        Math.max(1, Math.ceil(selected.length / 25)),
      );
      const existing = await client.query<{ count: string }>(
        `SELECT COUNT(*)::TEXT AS count
         FROM public.succession_planning_rows`,
      );
      return {
        id,
        fileName: preview.file_name,
        totalRows: rows.length,
        warningRows,
        existingRows: Number(existing.rows[0].count),
        filteredRows: selected.length,
        page,
        rows: selected.slice((page - 1) * 25, page * 25),
        warningSummaries:
          filter === 'warnings'
            ? warningSummaries.slice((page - 1) * 25, page * 25)
            : [],
      };
    });
  }

  async editPreview(
    actor: string,
    id: string,
    rowInput: string,
    input?: unknown,
  ) {
    if (!/^[1-9]\d{0,5}$/.test(rowInput))
      throw new BadRequestException('Invalid Excel row number.');
    const values =
      input === undefined ? undefined : cleanSuccessionPlanningValues(input);
    await this.database.transaction(async (client) => {
      await this.previewLock(client, actor, id);
      if (!values) {
        const count = await client.query<{ count: string }>(
          `SELECT COUNT(*)::TEXT AS count
           FROM public.succession_planning_preview_rows
           WHERE preview_id = $1`,
          [id],
        );
        if (Number(count.rows[0].count) <= 1)
          throw new ConflictException(
            'The final preview row cannot be deleted. Cancel the preview instead.',
          );
      }
      const result = values
        ? await client.query(
            `UPDATE public.succession_planning_preview_rows
             SET row_data = $3::JSONB
             WHERE preview_id = $1 AND row_number = $2`,
            [id, Number(rowInput), JSON.stringify(values)],
          )
        : await client.query(
            `DELETE FROM public.succession_planning_preview_rows
             WHERE preview_id = $1 AND row_number = $2`,
            [id, Number(rowInput)],
          );
      if (!result.rowCount)
        throw new NotFoundException('Preview row was not found.');
    });
  }

  async cancel(actor: string, id: string) {
    await this.database.transaction(async (client) => {
      await this.previewLock(client, actor, id);
      await client.query(
        'DELETE FROM public.succession_planning_previews WHERE id = $1',
        [id],
      );
    });
  }

  async commit(actor: string, id: string, confirmed: unknown) {
    if (confirmed !== true)
      throw new BadRequestException(
        'Confirm replacement of every current Succession Planning row.',
      );
    return this.database.transaction(async (client) => {
      const revision = await this.lockState(client);
      const preview = await this.previewLock(client, actor, id);
      if (preview.base_revision !== revision)
        throw new ConflictException(
          'The Succession Planning positions changed after this preview. Upload the workbook again.',
        );
      const rows = await this.validatedRows(client, id);
      if (!rows.length)
        throw new ConflictException('The preview does not contain any rows.');
      const existing = await client.query<{ count: string }>(
        'SELECT COUNT(*)::TEXT AS count FROM public.succession_planning_rows',
      );
      const replacedRows = Number(existing.rows[0].count);
      const imported = await client.query<{ id: string }>(
        `INSERT INTO public.succession_planning_imports
           (file_name, file_hash, row_count, replaced_rows, imported_by)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [
          preview.file_name,
          preview.file_hash,
          rows.length,
          replacedRows,
          actor,
        ],
      );
      await client.query('DELETE FROM public.succession_planning_rows');
      await client.query(
        `INSERT INTO public.succession_planning_rows (
           ${successionPlanningColumns.join(', ')},
           import_id, updated_by_account_id
         )
         SELECT
           v.entity, v.updated_by_name, v.area, v.position_jd_id, v.jd_name,
           v.ipe_level, v.employee_subgroup, v.criticality, v.priority,
           v.incumbent_pers_no, v.incumbent_name,
           v.incumbent_org_unit, v.incumbent_range,
           v.incumbent_tenure_years,
           v.incumbent_age,
           v.incumbent_change_year,
           v.incumbent_9_box_rating, v.reason_for_change,
           v.successor1_pers_no, v.successor1_name,
           v.successor1_dept_code, v.successor1_current_jd_id,
           v.successor1_readiness, v.successor1_9_box_rating,
           v.successor1_idp_status,
           v.successor2_pers_no, v.successor2_name,
           v.successor2_dept_code, v.successor2_current_jd_id,
           v.successor2_readiness, v.successor2_9_box_rating,
           v.successor2_idp_status, $2::UUID, $3::UUID
         FROM JSONB_TO_RECORDSET($1::JSONB) AS v(
           ${successionPlanningColumns.map((column) => `${column} TEXT`).join(', ')}
         )`,
        [
          JSON.stringify(rows.map((row) => row.values)),
          imported.rows[0].id,
          actor,
        ],
      );
      await client.query(
        `UPDATE public.succession_planning_state
         SET revision = revision + 1 WHERE singleton = TRUE`,
      );
      await client.query(
        `UPDATE public.succession_planning_previews
         SET status = 'committed' WHERE id = $1`,
        [id],
      );
      return { importedRows: rows.length, replacedRows };
    });
  }
}
