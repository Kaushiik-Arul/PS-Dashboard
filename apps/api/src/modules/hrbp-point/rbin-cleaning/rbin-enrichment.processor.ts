import ExcelJS from 'exceljs';

const persNoHeader = 'persno';
const otherDesignationHeader = 'otherdesignation';
const hrbpGlobalIdHeader = 'globalidofhrbp';
const hrbp2GlobalIdHeader = 'globalidofhrbp2';

export type RbinEnrichmentSummary = {
  matchedTargetRows: number;
  filledCells: number;
  addedColumns: number;
  unmatchedTargetRows: number;
};

export type RbinEnrichmentResult = {
  buffer: Buffer;
  fileName: string;
  summary: RbinEnrichmentSummary;
};

type WorkbookFile = {
  originalname: string;
  buffer: Buffer;
};

type ParsedSheet = {
  worksheet: ExcelJS.Worksheet;
  headers: Map<string, number>;
  headerOrder: Array<{ normalized: string; label: string; column: number }>;
  rowsByPersNo: Map<string, ExcelJS.Row>;
};

export class RbinEnrichmentValidationError extends Error {}

function normalizeHeader(value: string): string {
  const normalized = value.toLocaleLowerCase('en-US').replace(/[^a-z0-9]/g, '');
  return normalized === hrbpGlobalIdHeader && /\bOf\b/.test(value)
    ? hrbp2GlobalIdHeader
    : normalized;
}

function cellText(cell: ExcelJS.Cell): string {
  return cell.text.trim();
}

function isBlank(cell: ExcelJS.Cell): boolean {
  return cell.value === null || cell.value === undefined || (typeof cell.value === 'string' && cell.value.trim() === '');
}

function persNoValue(cell: ExcelJS.Cell, workbookLabel: string, rowNumber: number): string {
  if (typeof cell.value === 'number') {
    if (!Number.isSafeInteger(cell.value) || cell.value < 0) {
      throw new RbinEnrichmentValidationError(
        `${workbookLabel} row ${rowNumber} has an unsafe numeric Pers.No. Format identifiers as text in Excel.`,
      );
    }
    return String(cell.value);
  }
  if (typeof cell.value !== 'string') {
    throw new RbinEnrichmentValidationError(
      `${workbookLabel} row ${rowNumber} has an invalid Pers.No. Format identifiers as text in Excel.`,
    );
  }
  const value = cell.value.trim();
  if (!value) throw new RbinEnrichmentValidationError(`${workbookLabel} row ${rowNumber} has a blank Pers.No.`);
  return value;
}

function parseSheet(workbook: ExcelJS.Workbook, workbookLabel: string): ParsedSheet {
  const nonEmptySheets = workbook.worksheets.filter((worksheet) => worksheet.actualRowCount > 0);
  if (nonEmptySheets.length !== 1) {
    throw new RbinEnrichmentValidationError(`${workbookLabel} must contain exactly one non-empty worksheet.`);
  }
  const worksheet = nonEmptySheets[0];
  if (worksheet.actualRowCount < 2) {
    throw new RbinEnrichmentValidationError(`${workbookLabel} must contain a header row and at least one data row.`);
  }

  const headers = new Map<string, number>();
  const headerOrder: ParsedSheet['headerOrder'] = [];
  worksheet.getRow(1).eachCell({ includeEmpty: false }, (cell, column) => {
    const label = cellText(cell);
    let normalized = normalizeHeader(label);
    if (!normalized) return;
    if (normalized === hrbpGlobalIdHeader && headers.has(normalized) && !headers.has(hrbp2GlobalIdHeader)) {
      normalized = hrbp2GlobalIdHeader;
    }
    if (headers.has(normalized)) {
      throw new RbinEnrichmentValidationError(`${workbookLabel} contains duplicate header "${label}" after normalization.`);
    }
    headers.set(normalized, column);
    headerOrder.push({ normalized, label, column });
  });

  const persNoColumn = headers.get(persNoHeader);
  if (!persNoColumn) {
    throw new RbinEnrichmentValidationError(`${workbookLabel} must contain exactly one Pers.No header.`);
  }

  const rowsByPersNo = new Map<string, ExcelJS.Row>();
  for (let rowNumber = 2; rowNumber <= worksheet.actualRowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    const persNo = persNoValue(row.getCell(persNoColumn), workbookLabel, rowNumber);
    if (rowsByPersNo.has(persNo)) {
      throw new RbinEnrichmentValidationError(`${workbookLabel} contains duplicate Pers.No value "${persNo}".`);
    }
    rowsByPersNo.set(persNo, row);
  }
  return { worksheet, headers, headerOrder, rowsByPersNo };
}

function copyColumnPresentation(source: ExcelJS.Column, target: ExcelJS.Column) {
  target.width = source.width;
  target.hidden = source.hidden;
  target.outlineLevel = source.outlineLevel;
  target.style = { ...source.style };
}

function copyCellValue(source: ExcelJS.Cell, target: ExcelJS.Cell) {
  const value = source.value;
  target.value = value && typeof value === 'object' && 'formula' in value
    ? value.result ?? source.text
    : value;
  target.numFmt = source.numFmt;
}

function outputFileName(targetName: string): string {
  const stem = targetName.replace(/\.xlsx$/i, '');
  return `${stem}_enriched.xlsx`;
}

export async function enrichRbinWorkbook(
  baseFile: WorkbookFile,
  targetFile: WorkbookFile,
): Promise<RbinEnrichmentResult> {
  const [baseWorkbook, targetWorkbook] = [new ExcelJS.Workbook(), new ExcelJS.Workbook()];
  type ExcelJsBuffer = Parameters<typeof baseWorkbook.xlsx.load>[0];
  await Promise.all([
    baseWorkbook.xlsx.load(baseFile.buffer as unknown as ExcelJsBuffer),
    targetWorkbook.xlsx.load(targetFile.buffer as unknown as ExcelJsBuffer),
  ]);
  const base = parseSheet(baseWorkbook, 'Base workbook');
  const target = parseSheet(targetWorkbook, 'Target workbook');
  const targetPersNoColumn = target.headers.get(persNoHeader)!;

  let nextColumn = Math.max(0, ...target.headerOrder.map((header) => header.column)) + 1;
  const addedHeaders: Array<{ normalized: string; baseColumn?: number; targetColumn: number }> = [];
  for (const header of base.headerOrder) {
    if (target.headers.has(header.normalized)) continue;
    const targetColumn = nextColumn++;
    target.headers.set(header.normalized, targetColumn);
    target.worksheet.getCell(1, targetColumn).value = header.label;
    copyColumnPresentation(base.worksheet.getColumn(header.column), target.worksheet.getColumn(targetColumn));
    target.worksheet.getCell(1, targetColumn).style = { ...base.worksheet.getCell(1, header.column).style };
    addedHeaders.push({ normalized: header.normalized, baseColumn: header.column, targetColumn });
  }
  if (!target.headers.has(otherDesignationHeader)) {
    const targetColumn = nextColumn;
    target.headers.set(otherDesignationHeader, targetColumn);
    target.worksheet.getCell(1, targetColumn).value = 'Other Designation';
    addedHeaders.push({ normalized: otherDesignationHeader, targetColumn });
  }

  let matchedTargetRows = 0;
  let filledCells = 0;
  for (const [persNo, targetRow] of target.rowsByPersNo) {
    const baseRow = base.rowsByPersNo.get(persNo);
    targetRow.getCell(targetPersNoColumn).value = persNo;
    targetRow.getCell(targetPersNoColumn).numFmt = '@';
    if (!baseRow) continue;
    matchedTargetRows += 1;
    for (const baseHeader of base.headerOrder) {
      if (baseHeader.normalized === persNoHeader || baseHeader.normalized === otherDesignationHeader) continue;
      const targetColumn = target.headers.get(baseHeader.normalized)!;
      const targetCell = targetRow.getCell(targetColumn);
      const baseCell = baseRow.getCell(baseHeader.column);
      if (isBlank(targetCell) && !isBlank(baseCell)) {
        copyCellValue(baseCell, targetCell);
        filledCells += 1;
      }
    }
  }

  const excelBuffer = await targetWorkbook.xlsx.writeBuffer();
  return {
    buffer: Buffer.from(excelBuffer),
    fileName: outputFileName(targetFile.originalname),
    summary: {
      matchedTargetRows,
      filledCells,
      addedColumns: addedHeaders.length,
      unmatchedTargetRows: target.rowsByPersNo.size - matchedTargetRows,
    },
  };
}