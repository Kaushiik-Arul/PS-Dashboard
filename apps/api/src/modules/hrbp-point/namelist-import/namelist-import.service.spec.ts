import { BadRequestException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import ExcelJS from 'exceljs';
import { NamelistImportRepository } from './namelist-import.repository';
import { NamelistImportService } from './namelist-import.service';

describe('NamelistImportService export', () => {
  let repository: jest.Mocked<NamelistImportRepository>;
  let service: NamelistImportService;
  let listExportMonths: jest.Mock;
  let getExportRows: jest.Mock;
  let recordExport: jest.Mock;

  beforeEach(() => {
    listExportMonths = jest.fn();
    getExportRows = jest.fn();
    recordExport = jest.fn();
    repository = {
      listExportMonths,
      getExportRows,
      recordExport,
    } as unknown as jest.Mocked<NamelistImportRepository>;
    service = new NamelistImportService(repository);
  });

  it('lists the retained months returned by the repository', async () => {
    const months = [
      { reportingMonth: '2026-10', source: 'live', rowCount: 120 },
      { reportingMonth: '2026-09', source: 'historical', rowCount: 118 },
    ];
    listExportMonths.mockResolvedValue(months);

    await expect(service.listExportMonths()).resolves.toEqual(months);
  });

  it.each([
    [{ reportingMonth: '2026-10', columns: [] }, 'Select at least one Namelist column.'],
    [{ reportingMonth: '2026-10', columns: ['unknown'] }, 'unsupported Namelist column'],
    [{ reportingMonth: '2026-10', columns: ['pers_no', 'pers_no'] }, 'must not contain duplicates'],
    [{ reportingMonth: 'October 2026', columns: ['pers_no'] }, 'must use YYYY-MM'],
  ])('rejects invalid export input %#', async (input, message) => {
    await expect(service.exportNamelist(input, 'account-id'))
      .rejects.toThrow(message as string);
    expect(getExportRows).not.toHaveBeenCalled();
  });

  it('rejects input with unexpected properties', async () => {
    await expect(service.exportNamelist({
      reportingMonth: '2026-10',
      columns: ['pers_no'],
      format: 'csv',
    }, 'account-id')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('exports selected columns in order and records audit metadata', async () => {
    const columns = ['designation_text', 'pers_no', 'birth_date'] as const;
    getExportRows.mockResolvedValue({
      month: { reportingMonth: '2026-10', source: 'live', rowCount: 1 },
      rows: [{ designation_text: 'Engineer', pers_no: '12345', birth_date: '1990-05-14' }],
    });

    const result = await service.exportNamelist({ reportingMonth: '2026-10', columns }, 'account-id');

    expect(result.fileName).toBe('PS_Namelist_2026-10.xlsx');
    expect(getExportRows).toHaveBeenCalledWith('2026-10', columns);
    expect(recordExport).toHaveBeenCalledWith(
      '2026-10',
      'live',
      columns,
      1,
      result.fileName,
      expect.stringMatching(/^[0-9a-f]{64}$/),
      'account-id',
    );
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(result.buffer);
    const sheet = workbook.getWorksheet('PS Namelist');
    expect(sheet?.getRow(1).values).toEqual([undefined, 'Designation Text', 'Pers.No.', 'Birth date']);
    expect(sheet?.getCell('A2').value).toBe('Engineer');
    expect(sheet?.getCell('B2').value).toBe('12345');
    expect(sheet?.getCell('B2').numFmt).toBe('@');
    expect(sheet?.getCell('C2').value).toBeInstanceOf(Date);
    expect(sheet?.getCell('C2').numFmt).toBe('dd mmm yyyy');
  });

  it('returns not found when the selected month is no longer retained', async () => {
    getExportRows.mockResolvedValue(null);

    await expect(service.exportNamelist({
      reportingMonth: '2026-07',
      columns: ['pers_no'],
    }, 'account-id')).rejects.toBeInstanceOf(NotFoundException);
    expect(recordExport).not.toHaveBeenCalled();
  });

  it('does not return a file when audit recording fails', async () => {
    getExportRows.mockResolvedValue({
      month: { reportingMonth: '2026-10', source: 'live', rowCount: 1 },
      rows: [{ pers_no: '12345' }],
    });
    recordExport.mockRejectedValue(new Error('audit unavailable'));

    await expect(service.exportNamelist({
      reportingMonth: '2026-10',
      columns: ['pers_no'],
    }, 'account-id')).rejects.toBeInstanceOf(InternalServerErrorException);
  });
});