import { BadRequestException } from '@nestjs/common';
import ExcelJS from 'exceljs';

export type MrmPulSource = { value: string; header: string; sheet: string; row: number; previousValue: string | null; previousHeader: string };
export type MrmPulKey = 'corp' | 'in' | 'indirectMss' | 'directMss' | 'pcdDirectHc' | 'permanent' | 'temporary';
export type MrmPulResult = Record<MrmPulKey, MrmPulSource | null> & { errors: string[] };

const normalize = (value: string) => value.replace(/\s+/g, ' ').trim().toLowerCase();

function cellText(cell: ExcelJS.Cell): string {
  const value = cell.value;
  if (value === null || value === undefined) return '';
  if (typeof value === 'object' && 'result' in value) return String(value.result ?? '');
  return cell.text ?? String(value);
}

function cellNumber(cell: ExcelJS.Cell): number | null {
  let value: unknown = cell.value;
  if (value && typeof value === 'object' && 'result' in value) value = (value as { result: unknown }).result;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/,/g, '').trim());
    return value.trim() && Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

const ytdHeader = (year: number, month: number) => {
  const date = new Date(Date.UTC(year, month - 1, 1));
  return `YTD ${String(date.getUTCMonth() + 1).padStart(2, '0')}.${String(date.getUTCFullYear()).slice(2)}`;
};

// PS Corp reads the "PSIN Corp" row of Summary; the PS-IN rows come from Consolidation.
const sources = {
  corp: { sheet: 'summary', label: 'psin corp', pick: 'last' },
  in: { sheet: 'consolidation', label: 'indirect', pick: 'first' },
  indirectMss: { sheet: 'consolidation', label: 'indirect m&ss', pick: 'first' },
  directMss: { sheet: 'consolidation', label: 'direct m&ss', pick: 'first' },
  pcdDirectHc: { sheet: 'consolidation', label: 'direct', pick: 'first' },
  permanent: { sheet: 'consolidation', label: 'permanent', pick: 'first' },
  temporary: { sheet: 'consolidation', label: 'temporary', pick: 'first' },
} as const;

function readSource(
  workbook: ExcelJS.Workbook,
  source: (typeof sources)[keyof typeof sources],
  year: number,
  month: number,
): MrmPulSource {
  const sheet = workbook.worksheets.find((item) => normalize(item.name) === source.sheet);
  if (!sheet) throw new BadRequestException(`The workbook has no "${source.sheet}" sheet.`);

  const findColumn = (name: string) => {
    let found = 0;
    sheet.eachRow((row) => {
      if (found) return;
      row.eachCell((cell, column) => {
        if (!found && normalize(cellText(cell)) === normalize(name)) found = column;
      });
    });
    return found;
  };

  const header = ytdHeader(year, month);
  const columnNumber = findColumn(header);
  if (!columnNumber) throw new BadRequestException(`Column "${header}" was not found in the ${sheet.name} sheet.`);

  let targetRow = 0;
  sheet.eachRow((row, rowNumber) => {
    if (source.pick === 'first' && targetRow) return;
    if ([1, 2, 3].some((column) => normalize(cellText(row.getCell(column))) === source.label)) targetRow = rowNumber;
  });
  if (!targetRow) throw new BadRequestException(`The "${source.label}" row was not found in the ${sheet.name} sheet.`);

  const read = (column: number) => {
    const number = column ? cellNumber(sheet.getRow(targetRow).getCell(column)) : null;
    return number === null ? null : String(Math.round(number));
  };
  const value = read(columnNumber);
  if (value === null) throw new BadRequestException(`No value found under "${header}" in the ${sheet.name} sheet yet.`);

  const previousHeader = ytdHeader(year, month - 1);
  return { value, header, sheet: sheet.name, row: targetRow, previousValue: read(findColumn(previousHeader)), previousHeader };
}

/** Reads PS Corp and PS-IN PUL values for a data month (YYYY-MM) from the "YTD MM.YY" columns. */
export async function parseMrmPul(buffer: Buffer, dataMonth: string): Promise<MrmPulResult> {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(dataMonth);
  if (!match) throw new BadRequestException('Data month must use YYYY-MM.');

  const workbook = new ExcelJS.Workbook();
  type ExcelJsBuffer = Parameters<typeof workbook.xlsx.load>[0];
  try {
    await workbook.xlsx.load(buffer as unknown as ExcelJsBuffer);
  } catch {
    throw new BadRequestException('The file is not a valid XLSX workbook.');
  }

  const result: MrmPulResult = { corp: null, in: null, indirectMss: null, directMss: null, pcdDirectHc: null, permanent: null, temporary: null, errors: [] };
  for (const key of Object.keys(sources) as MrmPulKey[]) {
    try {
      result[key] = readSource(workbook, sources[key], Number(match[1]), Number(match[2]));
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Could not read the PUL value.');
    }
  }
  if (!(Object.keys(sources) as MrmPulKey[]).some((key) => result[key])) throw new BadRequestException(result.errors.join(' '));
  return result;
}
