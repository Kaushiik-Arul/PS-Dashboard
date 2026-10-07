import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { parseHeadcountWorkbook } from './headcount-import.parser';
import { HeadcountImportRepository } from './headcount-import.repository';
import type {
  HeadcountCommitResult,
  HeadcountPreview,
  ParsedHeadcountWorkbook,
  UploadedHeadcountFile,
} from './headcount-import.types';

@Injectable()
export class HeadcountImportService {
  private readonly logger = new Logger(HeadcountImportService.name);

  constructor(private readonly repository: HeadcountImportRepository) {}

  async createPreview(
    file: UploadedHeadcountFile | undefined,
    actorAccountId: string,
  ): Promise<HeadcountPreview> {
    if (!file) throw new BadRequestException('An XLSX workbook is required.');
    if (!file.buffer.length) throw new BadRequestException('The uploaded workbook is empty.');
    let parsed: ParsedHeadcountWorkbook;
    try {
      parsed = await parseHeadcountWorkbook(file);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new BadRequestException('The uploaded workbook could not be parsed.');
    }
    return this.run(
      () => this.repository.createPreview(actorAccountId, file, parsed),
      'Unable to create monthly headcount preview',
    );
  }

  async getPreview(previewId: string, actorAccountId: string): Promise<HeadcountPreview> {
    return this.run(async () => {
      const preview = await this.repository.getPreview(previewId, actorAccountId);
      if (!preview) throw new NotFoundException('Monthly headcount preview was not found or has expired.');
      return preview;
    }, 'Unable to load monthly headcount preview');
  }

  async cancel(previewId: string, actorAccountId: string): Promise<void> {
    await this.run(async () => {
      if (!(await this.repository.cancel(previewId, actorAccountId))) {
        throw new NotFoundException('Monthly headcount preview was not found or has expired.');
      }
    }, 'Unable to cancel monthly headcount preview');
  }

  async commit(
    previewId: string,
    confirmReplacement: unknown,
    actorAccountId: string,
  ): Promise<HeadcountCommitResult> {
    if (typeof confirmReplacement !== 'boolean') {
      throw new BadRequestException('Replacement confirmation must be a boolean.');
    }
    return this.run(
      () => this.repository.commit(previewId, actorAccountId, confirmReplacement),
      'Unable to import monthly headcount',
    );
  }

  private async run<Result>(operation: () => Promise<Result>, publicMessage: string): Promise<Result> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof HttpException) throw error;
      if (error instanceof Error) {
        if (error.message === 'PREVIEW_NOT_FOUND') {
          throw new NotFoundException('Monthly headcount preview was not found or has expired.');
        }
        if (error.message === 'INVALID_WORKBOOK') {
          throw new ConflictException('Resolve all workbook validation errors before importing.');
        }
        if (error.message === 'REPLACEMENT_CONFIRMATION_REQUIRED') {
          throw new ConflictException('Confirm replacement of the existing monthly headcount data.');
        }
      }
      this.logger.error(publicMessage);
      throw new InternalServerErrorException(publicMessage);
    }
  }
}