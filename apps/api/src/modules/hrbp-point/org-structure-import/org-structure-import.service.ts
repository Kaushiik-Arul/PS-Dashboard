import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { parseOrgStructureFile } from './org-structure-import.parser';
import { OrgStructureImportRepository } from './org-structure-import.repository';
import {
  orgStructureColumns,
  type OrgStructureFile,
  type OrgStructureValues,
} from './org-structure-import.types';

@Injectable()
export class OrgStructureImportService {
  private readonly logger = new Logger(OrgStructureImportService.name);

  constructor(private readonly repository: OrgStructureImportRepository) {}

  async createPreview(file: OrgStructureFile | undefined, actor: string) {
    if (!file) throw new BadRequestException('Choose an org structure XLSX workbook.');
    if (file.buffer.length > 50 * 1024 * 1024) throw new BadRequestException('File exceeds 50 MB.');
    const rows = await parseOrgStructureFile(file);
    return this.run(() => this.repository.createPreview(file, rows, actor));
  }

  getRows(id: string, actor: string, page = '1') {
    this.validateId(id);
    if (!/^[1-9]\d*$/.test(page) || Number(page) > 1000) throw new BadRequestException('Invalid preview page.');
    return this.run(() => this.repository.getPreview(id, actor, Number(page)));
  }

  async updateRow(id: string, rowInput: string, input: unknown, actor: string) {
    this.validateId(id);
    const rowNumber = this.validateRowNumber(rowInput);
    const values = this.validateValues(input);
    await this.run(() => this.repository.updateRow(id, actor, rowNumber, values));
  }

  async deleteRow(id: string, rowInput: string, actor: string) {
    this.validateId(id);
    const rowNumber = this.validateRowNumber(rowInput);
    await this.run(() => this.repository.deleteRow(id, actor, rowNumber));
  }

  async cancel(id: string, actor: string) {
    this.validateId(id);
    if (!await this.run(() => this.repository.cancel(id, actor))) {
      throw new NotFoundException('Org structure preview was not found.');
    }
  }

  commit(id: string, confirmation: unknown, actor: string) {
    this.validateId(id);
    if (typeof confirmation !== 'boolean') throw new BadRequestException('Replacement confirmation must be a boolean.');
    return this.run(() => this.repository.commit(id, actor, confirmation));
  }

  list() {
    return this.run(() => this.repository.list());
  }

  private validateId(id: string) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
      throw new BadRequestException('Invalid org structure preview ID.');
    }
  }

  private validateRowNumber(value: string): number {
    if (!/^[1-9]\d*$/.test(value) || Number(value) > 2_147_483_647) {
      throw new BadRequestException('Invalid Excel row number.');
    }
    return Number(value);
  }

  private validateValues(input: unknown): OrgStructureValues {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      throw new BadRequestException('Row values are required.');
    }
    const values = input as Record<string, unknown>;
    if (Object.keys(values).length !== orgStructureColumns.length || orgStructureColumns.some((key) => typeof values[key] !== 'string')) {
      throw new BadRequestException('Provide all org structure columns as text.');
    }
    return Object.fromEntries(orgStructureColumns.map((key) => [key, values[key]])) as OrgStructureValues;
  }

  private async run<T>(work: () => Promise<T>): Promise<T> {
    try {
      return await work();
    } catch (error) {
      if (error instanceof HttpException) throw error;
      if (error instanceof Error) {
        if (error.message === 'PREVIEW_NOT_FOUND') throw new NotFoundException('Org structure preview expired or was not found.');
        if (error.message === 'ROW_NOT_FOUND') throw new NotFoundException('Org structure preview row was not found.');
        if (error.message === 'LAST_PREVIEW_ROW') throw new ConflictException('The final preview row cannot be deleted. Cancel the preview instead.');
        if (error.message === 'CONFIRM_REQUIRED') throw new ConflictException('Confirm replacement of all org structure rows.');
        if (error.message === 'STALE_PREVIEW') throw new ConflictException('A newer org structure was imported. Upload this workbook again.');
      }
      this.logger.error('Org structure request failed');
      throw new InternalServerErrorException('Unable to process org structure data.');
    }
  }
}