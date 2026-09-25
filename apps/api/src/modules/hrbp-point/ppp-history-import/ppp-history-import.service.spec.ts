import { PppHistoryImportRepository } from './ppp-history-import.repository';
import { PppHistoryImportService } from './ppp-history-import.service';
import { pppImportColumns, type PppImportRowValues, type UploadedPppFile } from './ppp-history-import.types';

const currentYear = new Date().getUTCFullYear();

function header(column: string): string {
  const context: Record<string, string> = {
    pers_no: 'Pers.No.', personnel_number: 'Personnel Number', employee_subgroup: 'Employee Subgroup',
    ps_group: 'PS group', organizational_unit: 'Organizational Unit', range: 'Range', function: 'Function',
  };
  if (context[column]) return context[column];
  const [metric, slot] = column.split('_');
  const year = slot === 'current' ? currentYear : slot === 'previous' ? currentYear - 1 : currentYear - 2;
  return `${year} ${metric}${slot === 'current' ? ' Current' : ''}`;
}

function upload(persNo: string): UploadedPppFile {
  const values = Object.fromEntries(pppImportColumns.map((column) => [column, column === 'pers_no' ? persNo : 'value'])) as PppImportRowValues;
  return {
    originalname: 'ppp.csv',
    buffer: Buffer.from([
      pppImportColumns.map(header).join(','),
      pppImportColumns.map((column) => values[column]).join(','),
    ].join('\n')),
  };
}

describe('PppHistoryImportService', () => {
  it('keeps unknown employees import-valid but marks them to be skipped', async () => {
    const repository = {
      getKnownPersNos: jest.fn().mockResolvedValue(new Set()),
      createPreview: jest.fn().mockResolvedValue('preview-id'),
      getSummary: jest.fn().mockResolvedValue({ id: 'preview-id' }),
    } as unknown as jest.Mocked<PppHistoryImportRepository>;
    const service = new PppHistoryImportService(repository);

    await service.createPreview(upload('12345'), 'account-id');

    const rows = repository.createPreview.mock.calls[0][3];
    expect(rows[0].issues).toEqual([{
      column: 'pers_no',
      message: 'Employee is not in the current namelist and will be skipped.',
      severity: 'warning',
    }]);
  });

  it('passes the UTC server year when committing', async () => {
    const commit = jest.fn().mockResolvedValue({ employees: 1, yearlyRows: 3, skippedRows: 0 });
    const repository = {
      commit,
    } as unknown as jest.Mocked<PppHistoryImportRepository>;
    const service = new PppHistoryImportService(repository);

    await service.commit('preview-id', true, 'account-id');

    expect(commit).toHaveBeenCalledWith('preview-id', 'account-id', true, currentYear);
  });
});