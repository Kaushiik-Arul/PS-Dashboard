import { BadRequestException, ConflictException, HttpException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { ActiveStepRepository } from './active-step.repository';
import { parseStepFile, parsedDate, validateStepRow } from './active-step.parser';
import { stepColumns, type StepFile, type StepValues } from './active-step.types';

@Injectable()
export class ActiveStepService {
  private readonly logger = new Logger(ActiveStepService.name);
  constructor(private readonly repository: ActiveStepRepository) {}

  async createPreview(file: StepFile | undefined, actor: string) {
    if (!file) throw new BadRequestException('Choose a STEP XLSX workbook.');
    if (file.buffer.length > 50 * 1024 * 1024) throw new BadRequestException('File exceeds 50 MB.');
    const rows = await parseStepFile(file);
    return this.run(() => this.repository.createPreview(file, rows, actor));
  }

  getRows(id: string, actor: string, filter = 'all', page = '1') {
    this.validateId(id);
    if (!['all', 'valid', 'invalid'].includes(filter)) throw new BadRequestException('Invalid preview filter.');
    if (!/^[1-9]\d*$/.test(page) || +page > 1000) throw new BadRequestException('Invalid preview page.');
    return this.run(() => this.repository.getPreview(id, actor, filter, +page));
  }

  async updateRow(id: string, rowInput: string, input: unknown, actor: string) {
    this.validateId(id);
    const rowNumber = this.validateRowNumber(rowInput);
    const values = this.validateValues(input);
    const issues = validateStepRow(values);
    await this.run(() => this.repository.updateRow(id, actor, rowNumber, values, issues));
  }

  async deleteRow(id: string, rowInput: string, actor: string) {
    this.validateId(id);
    const rowNumber = this.validateRowNumber(rowInput);
    await this.run(() => this.repository.deleteRow(id, actor, rowNumber));
  }

  async cancel(id: string, actor: string) {
    this.validateId(id);
    if (!await this.run(() => this.repository.cancel(id, actor))) throw new NotFoundException('STEP preview was not found.');
  }

  commit(id: string, confirmation: unknown, actor: string) {
    this.validateId(id);
    if (typeof confirmation !== 'boolean') throw new BadRequestException('Replacement confirmation must be a boolean.');
    return this.run(() => this.repository.commit(id, actor, confirmation));
  }

  list(actor: string) { return this.run(() => this.repository.list(actor)); }

  private validateId(id: string) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) throw new BadRequestException('Invalid STEP preview ID.');
  }

  private validateRowNumber(value: string): number {
    if (!/^[1-9]\d*$/.test(value) || +value > 2_147_483_647) throw new BadRequestException('Invalid Excel row number.');
    return +value;
  }

  private validateValues(input: unknown): StepValues {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new BadRequestException('Row values are required.');
    const values = input as Record<string, unknown>;
    if (Object.keys(values).length !== stepColumns.length || stepColumns.some((key) => typeof values[key] !== 'string')) {
      throw new BadRequestException('Provide all STEP columns as text.');
    }
    const cleaned = Object.fromEntries(stepColumns.map((key) => [key, (values[key] as string).trim()])) as StepValues;
    for (const key of ['step_from', 'step_to'] as const) cleaned[key] = parsedDate(cleaned[key]) ?? cleaned[key];
    return cleaned;
  }

  private async run<T>(work: () => Promise<T>): Promise<T> {
    try { return await work(); }
    catch (error) {
      if (error instanceof HttpException) throw error;
      if (error instanceof Error) {
        if (error.message === 'PREVIEW_NOT_FOUND') throw new NotFoundException('STEP preview expired or was not found.');
        if (error.message === 'ROW_NOT_FOUND') throw new NotFoundException('STEP preview row was not found.');
        if (error.message === 'INVALID_ROWS') throw new ConflictException('Correct the invalid rows in Excel and upload it again.');
        if (error.message === 'STALE_PREVIEW') throw new ConflictException('A newer STEP workbook was imported. Upload this workbook again.');
        if (error.message === 'STALE_EMPLOYEES') throw new ConflictException('Employee data changed after preview. Upload the workbook again.');
        if (error.message === 'LAST_PREVIEW_ROW') throw new ConflictException('The final preview row cannot be deleted. Cancel the preview instead.');
        if (error.message === 'CONFIRM_REQUIRED') throw new ConflictException('Confirm replacement of all Active STEP rows.');
      }
      this.logger.error('Active STEP request failed');
      throw new InternalServerErrorException('Unable to process Active STEP data.');
    }
  }
}
