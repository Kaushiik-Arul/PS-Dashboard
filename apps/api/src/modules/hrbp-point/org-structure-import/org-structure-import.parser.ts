import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';
import ExcelJS from 'exceljs';
import {
  orgStructureColumns,
  optionalOrgStructureColumns,
  requiredOrgStructureColumns,
  type OrgStructureColumn,
  type OrgStructureFile,
  type OrgStructurePreviewRow,
  type OrgStructureValues,
} from './org-structure-import.types';

const expectedHeaders: Record<OrgStructureColumn, string> = {
  role_title: 'role title',
  reporting_to: 'reporting to',
  jd_id: 'jd id',
  career_level: 'career level',
  layer: 'layer',
  order_by: 'order by',
  is_active: 'is active',
  grade: 'grade',
  function: 'function',
};

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

function cellText(value: ExcelJS.CellValue): string {
  if (value == null) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean') return String(value).trim();
  if ('result' in value && value.result != null) return cellText(value.result);
  if ('text' in value) return String(value.text).trim();
  if ('richText' in value) return value.richText.map((item) => item.text).join('').trim();
  return '';
}

export async function parseOrgStructureFile(file: OrgStructureFile): Promise<OrgStructurePreviewRow[]> {
  if (!/\.xlsx$/i.test(file.originalname)) throw new BadRequestException('Choose an XLSX workbook.');

  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(file.buffer as never);
  } catch {
    throw new BadRequestException('The XLSX workbook could not be read.');
  }

  const sheet = workbook.worksheets[0];
  if (!sheet) throw new BadRequestException('The workbook has no worksheets.');

  const header = sheet.getRow(1);
  const mapped: { column: OrgStructureColumn; index: number }[] = requiredOrgStructureColumns.map((column, index) => {
    const actual = normalize(cellText(header.getCell(index + 1).value));
    if (actual !== expectedHeaders[column]) {
      throw new BadRequestException(`Expected "${expectedHeaders[column]}" at column ${index + 1}.`);
    }
    return { column, index: index + 1 };
  });

  const seenOptional = new Set<OrgStructureColumn>();
  for (let index = requiredOrgStructureColumns.length + 1; index <= header.actualCellCount; index++) {
    const actual = normalize(cellText(header.getCell(index).value));
    if (!actual) continue;
    const column = optionalOrgStructureColumns.find((candidate) => expectedHeaders[candidate] === actual);
    if (!column || seenOptional.has(column)) {
      throw new BadRequestException(`Expected optional "grade" or "function" at column ${index}.`);
    }
    seenOptional.add(column);
    mapped.push({ column, index });
  }

  const rows: OrgStructurePreviewRow[] = [];
  for (let number = 2; number <= sheet.rowCount; number++) {
    const source = sheet.getRow(number);
    const cells = mapped.map(({ index }) => cellText(source.getCell(index).value));
    if (cells.every((cell) => !cell)) continue;
    const values = Object.fromEntries(orgStructureColumns.map((column) => [column, ''])) as OrgStructureValues;
    mapped.forEach(({ column }, index) => { values[column] = cells[index]; });
    rows.push({
      rowNumber: number,
      values,
    });
    if (rows.length > 25_000) throw new PayloadTooLargeException('The workbook exceeds 25,000 rows.');
  }

  if (!rows.length) throw new BadRequestException('The workbook has no org structure rows.');
  return rows;
}