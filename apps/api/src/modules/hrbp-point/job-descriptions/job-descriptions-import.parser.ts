import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';
import { parse } from 'csv-parse/sync';
import type { JobDescriptionInput } from './job-descriptions.types';

type ImportColumn = 'jd_id' | 'role_title';

const aliases: Readonly<Record<string, ImportColumn>> = {
  jd_id: 'jd_id',
  jdid: 'jd_id',
  job_description_id: 'jd_id',
  role: 'role_title',
  role_name: 'role_title',
  role_title: 'role_title',
  jd_name: 'role_title',
};

function normalizeHeader(value: string): string {
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return aliases[normalized] ?? normalized;
}

export function parseJobDescriptionsCsv(file: { originalname: string; buffer: Buffer }): JobDescriptionInput[] {
  if (!file.originalname.toLowerCase().endsWith('.csv')) {
    throw new BadRequestException('Only CSV files are supported.');
  }
  const matrix = parse(file.buffer, { bom: true, relax_column_count: true, skip_empty_lines: true }) as string[][];
  if (matrix.length < 2) throw new BadRequestException('The CSV must contain a header and at least one data row.');
  const headers = matrix[0].map((value) => normalizeHeader(String(value)));
  const indexes = new Map<ImportColumn, number[]>();
  headers.forEach((header, index) => {
    if (header === 'jd_id' || header === 'role_title') {
      indexes.set(header, [...(indexes.get(header) ?? []), index]);
    }
  });
  const missing = (['jd_id', 'role_title'] as const).filter((column) => !indexes.has(column));
  const duplicates = [...indexes.entries()].filter(([, positions]) => positions.length > 1).map(([column]) => column);
  if (missing.length || duplicates.length) {
    const details = [
      missing.length ? `Missing: ${missing.join(', ')}.` : '',
      duplicates.length ? `Duplicates: ${duplicates.join(', ')}.` : '',
    ].filter(Boolean).join(' ');
    throw new BadRequestException(`The CSV must contain one JD ID column and one Role Title column. ${details}`);
  }

  const rows = matrix.slice(1).map((cells, index) => ({
    rowNumber: index + 2,
    jdId: String(cells[indexes.get('jd_id')![0]] ?? '').trim().toUpperCase(),
    roleTitle: String(cells[indexes.get('role_title')![0]] ?? '').trim(),
  })).filter((row) => row.jdId || row.roleTitle);
  if (!rows.length) throw new BadRequestException('The CSV does not contain any JD mappings.');
  if (rows.length > 25_000) throw new PayloadTooLargeException('The CSV exceeds the 25,000 row limit.');

  const seen = new Set<string>();
  for (const row of rows) {
    if (!row.jdId || !row.roleTitle) throw new BadRequestException(`Row ${row.rowNumber}: JD ID and Role Title are required.`);
    if (row.jdId.length > 100) throw new BadRequestException(`Row ${row.rowNumber}: JD ID must not exceed 100 characters.`);
    if (row.roleTitle.length > 200) throw new BadRequestException(`Row ${row.rowNumber}: Role Title must not exceed 200 characters.`);
    if (seen.has(row.jdId)) throw new BadRequestException(`Row ${row.rowNumber}: JD ID ${row.jdId} is duplicated in the CSV.`);
    seen.add(row.jdId);
  }
  return rows.map(({ jdId, roleTitle }) => ({ jdId, roleTitle }));
}