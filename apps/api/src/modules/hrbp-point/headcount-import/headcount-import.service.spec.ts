import { BadRequestException, ConflictException } from '@nestjs/common';
import { parseHeadcountWorkbook } from './headcount-import.parser';
import { HeadcountImportRepository } from './headcount-import.repository';
import { HeadcountImportService } from './headcount-import.service';
import type { HeadcountPreview, ParsedHeadcountWorkbook, UploadedHeadcountFile } from './headcount-import.types';

jest.mock('./headcount-import.parser', () => ({ parseHeadcountWorkbook: jest.fn() }));

const parsed: ParsedHeadcountWorkbook = {
  includedSheets: ['January 2023'],
  ignoredSheets: ['Notes'],
  months: [{
    sheetName: 'January 2023',
    reportingMonth: '2023-01-01',
    totalHeadcount: 1,
    ranges: [{ rangeKey: 'G1', rangeName: 'G1', headcount: 1 }],
  }],
  issues: [],
};

const preview: HeadcountPreview = {
  id: '5bcd3fbe-2f88-4eb4-a6d0-b348b8e72ee3',
  fileName: 'PS Namelist.xlsx',
  includedSheets: parsed.includedSheets,
  ignoredSheets: parsed.ignoredSheets,
  months: parsed.months.map((month) => ({ ...month, existingTotalHeadcount: null })),
  issues: [],
  expiresAt: '2026-10-08T00:00:00.000Z',
};

describe('HeadcountImportService', () => {
  const repository = {
    createPreview: jest.fn(),
    getPreview: jest.fn(),
    cancel: jest.fn(),
    commit: jest.fn(),
  };
  const service = new HeadcountImportService(repository as unknown as HeadcountImportRepository);
  const file: UploadedHeadcountFile = {
    originalname: 'PS Namelist.xlsx',
    buffer: Buffer.from('workbook'),
  };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('parses and stores an account-owned preview', async () => {
    jest.mocked(parseHeadcountWorkbook).mockResolvedValue(parsed);
    repository.createPreview.mockResolvedValue(preview);

    await expect(service.createPreview(file, 'account-id')).resolves.toEqual(preview);

    expect(repository.createPreview).toHaveBeenCalledWith('account-id', file, parsed);
  });

  it('rejects missing and empty workbook uploads', async () => {
    await expect(service.createPreview(undefined, 'account-id')).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.createPreview({ ...file, buffer: Buffer.alloc(0) }, 'account-id')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('requires a boolean replacement confirmation', async () => {
    await expect(service.commit(preview.id, 'yes', 'account-id')).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.commit).not.toHaveBeenCalled();
  });

  it('maps a stale replacement decision to a conflict', async () => {
    repository.commit.mockRejectedValue(new Error('REPLACEMENT_CONFIRMATION_REQUIRED'));

    await expect(service.commit(preview.id, false, 'account-id')).rejects.toBeInstanceOf(ConflictException);
  });
});