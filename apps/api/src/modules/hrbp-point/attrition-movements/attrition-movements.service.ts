import { BadRequestException, HttpException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import ExcelJS from 'exceljs';
import { AttritionMovementsRepository } from './attrition-movements.repository';
import {
  attritionMovementViews,
  type ConfirmedAttritionExport,
  type ConfirmedAttritionExportRow,
  type AttritionMovementsPage,
  type AttritionMovementView,
} from './attrition-movements.types';

const exportRowLimit = 100_000;

const exportColumns: Array<{ key: keyof ConfirmedAttritionExportRow; header: string; width: number }> = [
  { key: 'persNo', header: 'Pers.No', width: 14 },
  { key: 'eventMonth', header: 'Event Month', width: 15 },
  { key: 'exitLwd', header: 'Last Working Day', width: 18 },
  { key: 'eventType', header: 'Event Type', width: 16 },
  { key: 'transferType', header: 'Transfer Type', width: 24 },
  { key: 'withinPsType', header: 'Within-PS Type', width: 20 },
  { key: 'exitReason', header: 'Exit Reason', width: 28 },
  { key: 'oldOrganisationalAreaPa', header: 'Previous Area', width: 22 },
  { key: 'newOrganisationalAreaPa', header: 'Current Area', width: 22 },
  { key: 'oldOrganizationalUnit', header: 'Previous Org Unit', width: 24 },
  { key: 'newOrganizationalUnit', header: 'Current Org Unit', width: 24 },
  { key: 'oldRange', header: 'Previous Range', width: 20 },
  { key: 'newRange', header: 'Current Range', width: 20 },
  { key: 'oldRangeType', header: 'Previous Range Type', width: 21 },
  { key: 'newRangeType', header: 'Current Range Type', width: 21 },
  { key: 'notes', header: 'Notes', width: 36 },
];

function excelDate(value: string | null): Date | null {
  return value ? new Date(`${value.slice(0, 10)}T00:00:00Z`) : null;
}

function movementCategory(row: ConfirmedAttritionExportRow): string {
  if (row.eventType !== 'transfer') return row.eventType;
  return row.transferType ?? 'transfer';
}

@Injectable()
export class AttritionMovementsService {
  private readonly logger = new Logger(AttritionMovementsService.name);

  constructor(private readonly repository: AttritionMovementsRepository) {}

  async exportConfirmedHistory(actorAccountId: string): Promise<ConfirmedAttritionExport> {
    return this.run(async () => {
      const rows = await this.repository.getConfirmedExportRows();
      if (rows.length > exportRowLimit) {
        throw new BadRequestException(`Confirmed movement export cannot exceed ${exportRowLimit.toLocaleString('en-US')} rows.`);
      }
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'PS Dashboard';
      workbook.created = new Date();
      this.addSummarySheet(workbook, rows);
      this.addMovementsSheet(workbook, rows);
      const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
      const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
      const fileName = `PS_Confirmed_Attrition_All_History_${stamp}.xlsx`;
      await this.repository.recordExport(
        actorAccountId,
        rows.length,
        fileName,
        createHash('sha256').update(buffer).digest('hex'),
      );
      return { fileName, buffer };
    }, 'Unable to export confirmed attrition history');
  }

  async list(
    viewInput?: string,
    searchInput?: string,
    yearInput?: string,
    monthInput?: string,
    pageInput?: string,
    pageSizeInput?: string,
  ): Promise<AttritionMovementsPage> {
    const view = (viewInput?.trim() || 'all') as AttritionMovementView;
    if (!attritionMovementViews.includes(view)) throw new BadRequestException('Attrition movement view is invalid.');
    const search = searchInput?.trim() ?? '';
    if (search.length > 100) throw new BadRequestException('Search must not exceed 100 characters.');
    const year = this.optionalInteger(yearInput, 'Year', 2000, 2100);
    const month = this.optionalInteger(monthInput, 'Month', 1, 12);
    const page = this.positiveInteger(pageInput, 1, 1_000_000);
    const pageSize = this.positiveInteger(pageSizeInput, 25, 100);
    return this.run(
      () => this.repository.list(view, search, year, month, page, pageSize),
      'Unable to load attrition movements',
    );
  }

  async dismissCandidate(candidateId: string, actor: string): Promise<void> {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(candidateId)) {
      throw new BadRequestException('Invalid departure candidate ID.');
    }
    const dismissed = await this.run(
      () => this.repository.dismissCandidate(candidateId, actor),
      'Unable to dismiss the departure candidate',
    );
    if (!dismissed) throw new NotFoundException('Pending departure candidate was not found.');
  }

  private addSummarySheet(workbook: ExcelJS.Workbook, rows: ConfirmedAttritionExportRow[]): void {
    const sheet = workbook.addWorksheet('Summary', { views: [{ state: 'frozen', ySplit: 1 }] });
    sheet.columns = [{ width: 30 }, { width: 18 }];
    sheet.addRow(['Confirmed Attrition History', 'Count']);
    sheet.addRow(['All confirmed movements', rows.length]);
    sheet.addRow(['PS attrition', rows.filter((row) => row.countsAsPsAttrition).length]);
    sheet.addRow(['Within-PS movements', rows.filter((row) => !row.countsAsPsAttrition).length]);
    sheet.addRow([]);
    sheet.addRow(['Movement category', 'Count']);
    const categoryCounts = new Map<string, number>();
    rows.forEach((row) => categoryCounts.set(movementCategory(row), (categoryCounts.get(movementCategory(row)) ?? 0) + 1));
    [...categoryCounts].sort(([left], [right]) => left.localeCompare(right))
      .forEach(([category, count]) => sheet.addRow([category, count]));
    sheet.addRow([]);
    sheet.addRow(['Source', 'Count']);
    const sourceCounts = new Map<string, number>();
    rows.forEach((row) => sourceCounts.set(row.source, (sourceCounts.get(row.source) ?? 0) + 1));
    [...sourceCounts].sort(([left], [right]) => left.localeCompare(right))
      .forEach(([source, count]) => sheet.addRow([source, count]));
    sheet.addRow([]);
    sheet.addRow(['Range classification', 'Count']);
    const rangeTypeCounts = new Map<string, number>();
    rows.forEach((row) => {
      const rangeType = row.newRangeType ?? row.oldRangeType ?? 'not_available';
      rangeTypeCounts.set(rangeType, (rangeTypeCounts.get(rangeType) ?? 0) + 1);
    });
    [...rangeTypeCounts].sort(([left], [right]) => left.localeCompare(right))
      .forEach(([rangeType, count]) => sheet.addRow([rangeType, count]));
    sheet.addRow([]);
    sheet.addRow(['Event year', 'Count']);
    const yearCounts = new Map<string, number>();
    rows.forEach((row) => {
      const year = row.eventMonth.slice(0, 4);
      yearCounts.set(year, (yearCounts.get(year) ?? 0) + 1);
    });
    [...yearCounts].sort(([left], [right]) => right.localeCompare(left))
      .forEach(([year, count]) => sheet.addRow([year, count]));
    sheet.addRow([]);
    sheet.addRow(['Event month', 'Count']);
    const monthCounts = new Map<string, number>();
    rows.forEach((row) => {
      const month = row.eventMonth.slice(0, 7);
      monthCounts.set(month, (monthCounts.get(month) ?? 0) + 1);
    });
    [...monthCounts].sort(([left], [right]) => right.localeCompare(left))
      .forEach(([month, count]) => sheet.addRow([month, count]));
    const sourceHeaderRow = 8 + categoryCounts.size;
    const rangeHeaderRow = sourceHeaderRow + sourceCounts.size + 2;
    const yearHeaderRow = rangeHeaderRow + rangeTypeCounts.size + 2;
    const monthHeaderRow = yearHeaderRow + yearCounts.size + 2;
    [1, 6, sourceHeaderRow, rangeHeaderRow, yearHeaderRow, monthHeaderRow]
      .forEach((rowNumber) => { sheet.getRow(rowNumber).font = { bold: true }; });
  }

  private addMovementsSheet(workbook: ExcelJS.Workbook, rows: ConfirmedAttritionExportRow[]): void {
    const sheet = workbook.addWorksheet('Confirmed Movements', { views: [{ state: 'frozen', ySplit: 1 }] });
    sheet.columns = exportColumns.map((column) => ({ ...column }));
    sheet.getRow(1).font = { bold: true };
    rows.forEach((source) => {
      const row = sheet.addRow(exportColumns.map(({ key }) => {
        if (key === 'eventMonth' || key === 'exitLwd') return excelDate(source[key] as string | null);
        if (key === 'createdAt' || key === 'updatedAt') return new Date(source[key]);
        return source[key] ?? null;
      }));
      row.getCell(1).numFmt = '@';
      row.getCell(2).numFmt = 'mmm yyyy';
      row.getCell(3).numFmt = 'dd mmm yyyy';
    });
    sheet.autoFilter = { from: 'A1', to: `${sheet.getColumn(exportColumns.length).letter}1` };
  }

  private optionalInteger(value: string | undefined, label: string, minimum: number, maximum: number): number | null {
    if (value === undefined || value.trim() === '') return null;
    if (!/^\d+$/.test(value)) throw new BadRequestException(`${label} must be a whole number.`);
    const parsed = Number(value);
    if (parsed < minimum || parsed > maximum) throw new BadRequestException(`${label} must be between ${minimum} and ${maximum}.`);
    return parsed;
  }

  private positiveInteger(value: string | undefined, fallback: number, maximum: number): number {
    if (value === undefined) return fallback;
    if (!/^\d+$/.test(value)) throw new BadRequestException('Pagination values must be positive whole numbers.');
    const parsed = Number(value);
    if (parsed < 1 || parsed > maximum) throw new BadRequestException(`Pagination value must be between 1 and ${maximum}.`);
    return parsed;
  }

  private async run<Result>(operation: () => Promise<Result>, message: string): Promise<Result> {
    try { return await operation(); } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(message);
      throw new InternalServerErrorException(message);
    }
  }
}