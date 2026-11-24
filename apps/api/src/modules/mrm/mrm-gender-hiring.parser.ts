import { BadRequestException } from '@nestjs/common';
import ExcelJS from 'exceljs';

export type MrmGenderHiringRow = {
  row: number;
  name: string;
  joiningDate: string;
  orgUnit: string;
  range: string | null;
  inCorp: boolean;
};
export type MrmGenderHiringMonth = {
  month: string;
  rows: MrmGenderHiringRow[];
  inCount: number;
  corpCount: number;
};
export type MrmLeadTimeRow = MrmGenderHiringRow & { leadTime: number; leadTimeMissing: boolean };
export type MrmGenderHiringResult = {
  leadTimeRows: MrmLeadTimeRow[];
  latest: MrmGenderHiringMonth;
  previous: MrmGenderHiringMonth;
  unmappedOrgUnits: string[];
  unreadableDates: { row: number; name: string; text: string }[];
  femaleRows: number;
};

export const corporateExcludedRanges = new Set(['BIDP', 'NAP', 'JAP', 'GANP']);

export const normalizeOrgUnit = (value: string) => value.replace(/\s+/g, ' ').trim().toLowerCase();

const normalize = normalizeOrgUnit;

function cellText(cell: ExcelJS.Cell): string {
  const value = cell.value;
  if (value === null || value === undefined) return '';
  if (typeof value === 'object' && 'result' in value) return String(value.result ?? '');
  return cell.text ?? String(value);
}

function cellDate(cell: ExcelJS.Cell): string | null {
  let value: unknown = cell.value;
  if (value && typeof value === 'object' && 'result' in value) value = (value as { result: unknown }).result;
  const format = (year: number, month: number, day: number) => (
    `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  );
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return format(value.getUTCFullYear(), value.getUTCMonth() + 1, value.getUTCDate());
  }
  if (typeof value === 'number' && value > 20000 && value < 80000) {
    const date = new Date(Math.round((value - 25569) * 86400000));
    return format(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
  }
  const text = (typeof value === 'string' ? value : cellText(cell)).trim();
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(text);
  if (iso) return format(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  const match = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4}|\d{2})/.exec(text);
  if (!match) return null;
  const month = Number(match[1]);
  const year = match[3].length === 2 ? 2000 + Number(match[3]) : Number(match[3]);
  return month >= 1 && month <= 12 ? format(year, month, Number(match[2])) : null;
}

const shiftMonth = (month: string, offset: number) => {
  const [year, value] = month.split('-').map(Number);
  const date = new Date(Date.UTC(year, value - 1 + offset, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
};

/**
 * Lists female joiners for the latest report column month (YYYY-MM) and the month before it.
 * PS-IN counts every row; PS Corp keeps rows whose Specific Org unit maps to a
 * range outside BidP, NaP, JaP and GanP.
 */
export async function parseMrmGenderHiring(
  buffer: Buffer,
  latestMonth: string,
  rangeByOrgUnit: Map<string, string>,
): Promise<MrmGenderHiringResult> {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(latestMonth)) throw new BadRequestException('Month must use YYYY-MM.');

  const workbook = new ExcelJS.Workbook();
  type ExcelJsBuffer = Parameters<typeof workbook.xlsx.load>[0];
  try {
    await workbook.xlsx.load(buffer as unknown as ExcelJsBuffer);
  } catch {
    throw new BadRequestException('The file is not a valid XLSX workbook.');
  }

  const candidates: MrmGenderHiringResult[] = [];
  for (const sheet of workbook.worksheets) {
    let headerRow = 0;
    const columns = { date: 0, gender: 0, orgUnit: 0, name: 0, lead: 0 };
    sheet.eachRow((row, rowNumber) => {
      if (headerRow) return;
      const found = { date: 0, gender: 0, orgUnit: 0, name: 0, lead: 0 };
      row.eachCell((cell, column) => {
        const text = normalize(cellText(cell));
        if (!found.date && text.startsWith('actual date of joining')) found.date = column;
        if (!found.gender && text === 'gender') found.gender = column;
        if (!found.orgUnit && text === 'specific org unit') found.orgUnit = column;
        if (!found.name && text === 'name of select') found.name = column;
        if (!found.lead && text === 'lead time to offer') found.lead = column;
      });
      if (found.date && found.gender && found.orgUnit) {
        headerRow = rowNumber;
        Object.assign(columns, found);
      }
    });
    if (!headerRow) continue;

    const previousMonth = shiftMonth(latestMonth, -1);
    const empty = (month: string): MrmGenderHiringMonth => ({ month, rows: [], inCount: 0, corpCount: 0 });
    const yearStart = `${previousMonth.slice(0, 4)}-01`;
    const result: MrmGenderHiringResult = {
      leadTimeRows: [],
      latest: empty(latestMonth),
      previous: empty(previousMonth),
      unmappedOrgUnits: [],
      unreadableDates: [],
      femaleRows: 0,
    };
    const unmapped = new Set<string>();
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber <= headerRow) return;
      const gender = normalize(cellText(row.getCell(columns.gender)));
      const isFemale = gender === 'female' || gender === 'f';
      if (isFemale) result.femaleRows += 1;
      const name = columns.name ? cellText(row.getCell(columns.name)).trim() : '';
      const joiningDate = cellDate(row.getCell(columns.date));
      if (!joiningDate) {
        if (isFemale) result.unreadableDates.push({ row: rowNumber, name, text: cellText(row.getCell(columns.date)).trim() });
        return;
      }
      const month = joiningDate.slice(0, 7);
      const target = !isFemale ? null : month === latestMonth ? result.latest : month === previousMonth ? result.previous : null;
      const inLeadTimeWindow = month >= yearStart && month <= latestMonth;
      if (!target && !inLeadTimeWindow) return;

      const orgUnit = cellText(row.getCell(columns.orgUnit)).trim();
      const range = rangeByOrgUnit.get(normalize(orgUnit))?.trim() || null;
      if (!range) unmapped.add(orgUnit || '(blank)');
      const inCorp = Boolean(range) && !corporateExcludedRanges.has(range!.toUpperCase());
      const base = { row: rowNumber, name, joiningDate, orgUnit, range, inCorp };
      if (target) {
        target.rows.push(base);
        target.inCount += 1;
        if (inCorp) target.corpCount += 1;
      }
      if (inLeadTimeWindow && columns.lead) {
        const raw = Number(cellText(row.getCell(columns.lead)).trim());
        const leadTimeMissing = !Number.isFinite(raw) || cellText(row.getCell(columns.lead)).trim() === '';
        result.leadTimeRows.push({ ...base, leadTime: leadTimeMissing ? 0 : raw, leadTimeMissing });
      }
    });
    result.unmappedOrgUnits = [...unmapped];
    candidates.push(result);
  }
  // Several sheets can carry these headers; the hiring list is the one with the most women.
  if (candidates.length) return candidates.reduce((best, item) => (item.femaleRows > best.femaleRows ? item : best));
  throw new BadRequestException('Columns "Actual Date of Joining", "Gender" and "Specific Org unit" were not found.');
}

