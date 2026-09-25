import { BadRequestException } from '@nestjs/common';
import { pppImportColumns, type PppImportRowValues, type UploadedPppFile } from './ppp-history-import.types';
import { parsePppHistoryFile, validatePppImportRow } from './ppp-history-import.parser';

const contextLabels: Record<string, string> = {
  pers_no: 'Pers.No.',
  personnel_number: 'Personnel Number',
  employee_subgroup: 'Employee Subgroup',
  ps_group: 'PS group',
  organizational_unit: 'Organizational Unit',
  range: 'Range',
  function: 'Function',
};

function headers(year: number): string[] {
  return pppImportColumns.map((column) => {
    if (contextLabels[column]) return contextLabels[column];
    const [metric, slot] = column.split('_');
    const metricYear = slot === 'current' ? year : slot === 'previous' ? year - 1 : year - 2;
    return `${metricYear} ${metric[0].toUpperCase()}${metric.slice(1)}${slot === 'current' ? ' Current' : ''}`;
  });
}

function values(): PppImportRowValues {
  const row = Object.fromEntries(pppImportColumns.map((column) => [column, `${column}-value`])) as PppImportRowValues;
  row.pers_no = '12345';
  return row;
}

function csvFile(content: string): UploadedPppFile {
  return { originalname: 'ppp-history.csv', buffer: Buffer.from(content) };
}

function csv(year: number, row = values(), customHeaders = headers(year)): UploadedPppFile {
  return csvFile([customHeaders.join(','), pppImportColumns.map((column) => row[column]).join(',')].join('\n'));
}

describe('PPP history import parser', () => {
  it('maps the current year and prior two years to stable fields', async () => {
    const parsed = await parsePppHistoryFile(csv(2026), 2026);
    expect(parsed.currentYear).toBe(2026);
    expect(parsed.rows[0].values).toEqual(values());
    expect(parsed.rows[0].issues).toEqual([]);
  });

  it('rolls accepted headers forward with the supplied current year', async () => {
    await expect(parsePppHistoryFile(csv(2027), 2027)).resolves.toMatchObject({ currentYear: 2027 });
    await expect(parsePppHistoryFile(csv(2026), 2027)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('maps reordered columns by header', async () => {
    const row = values();
    const columns = [...pppImportColumns].reverse();
    const reorderedHeaders = headers(2026).reverse();
    const file = csvFile([reorderedHeaders.join(','), columns.map((column) => row[column]).join(',')].join('\n'));
    const parsed = await parsePppHistoryFile(file, 2026);
    expect(parsed.rows[0].values).toEqual(row);
  });

  it('allows blank metric values', () => {
    const row = values();
    row.performance_current = '';
    row.tcl_oldest = '';
    expect(validatePppImportRow(row)).toEqual([]);
  });

  it('rejects a missing header and a misplaced Current suffix', async () => {
    await expect(parsePppHistoryFile(csv(2026, values(), headers(2026).slice(0, -1)), 2026))
      .rejects.toBeInstanceOf(BadRequestException);
    const misplaced = headers(2026).map((header) => header === '2025 Performance' ? '2025 Performance Current' : header);
    await expect(parsePppHistoryFile(csv(2026, values(), misplaced), 2026))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it('marks duplicate employee numbers invalid', async () => {
    const file = csvFile([headers(2026).join(','), pppImportColumns.map((column) => values()[column]).join(','), pppImportColumns.map((column) => values()[column]).join(',')].join('\n'));
    const parsed = await parsePppHistoryFile(file, 2026);
    expect(parsed.rows.every((row) => row.issues.some((issue) => issue.message.includes('duplicated')))).toBe(true);
  });
});