import { namelistColumns, type NamelistRowValues } from '../namelist-import/namelist-import.types';
import { RbinCleaningRepository } from './rbin-cleaning.repository';
import { RbinCleaningService } from './rbin-cleaning.service';
import type { MappingSource, RbinBatchSummary, RbinStagedRow } from './rbin-cleaning.types';

function values(organizationalUnit: string, persNo: string): NamelistRowValues {
  const result = Object.fromEntries(namelistColumns.map((column) => [column, `${column}-value`])) as NamelistRowValues;
  return {
    ...result,
    pers_no: persNo,
    global_id: persNo,
    hrbp_global_id: persNo,
    organizational_unit: organizationalUnit,
    range: '',
    function: '',
    birth_date: '1990-01-01',
    joining_date: '2020-01-01',
    entry_for_retirement: '2050-01-01',
    technical_entry_date: '2020-01-01',
    official_email: `${persNo}@example.com`,
  };
}

function stagedRow(
  rowNumber: number,
  organizationalUnit: string,
  rangeSource: MappingSource,
  functionSource: MappingSource,
): RbinStagedRow {
  const current = values(organizationalUnit, String(1000 + rowNumber));
  if (rangeSource !== 'missing') current.range = 'Existing Range';
  if (functionSource !== 'missing') current.function = 'Existing Function';
  return {
    rowNumber,
    originalValues: { ...current },
    values: current,
    issues: [],
    comparisonStatus: 'new',
    baselineValues: null,
    changedColumns: [],
    rangeSource,
    functionSource,
  };
}

describe('RbinCleaningService mappings', () => {
  it('saves mappings for every matching missing row without replacing overrides', async () => {
    const rows = [
      stagedRow(2, 'NaP/MFC15', 'missing', 'missing'),
      stagedRow(3, ' nap/mfc15 ', 'exception', 'manual'),
      stagedRow(4, 'Other Unit', 'missing', 'missing'),
    ];
    const summary = { id: 'batch-id' } as RbinBatchSummary;
    const repository = {
      getAllRows: jest.fn().mockResolvedValue(rows),
      saveMappingsAndUpdateRows: jest.fn().mockResolvedValue(undefined),
      getSummary: jest.fn().mockResolvedValue(summary),
    };
    const service = new RbinCleaningService(repository as unknown as RbinCleaningRepository);

    await expect(service.saveMapping('batch-id', {
      organizationalUnit: 'NaP/MFC15',
      range: 'NaP',
      function: 'MFC',
    }, 'account-id')).resolves.toBe(summary);

    expect(rows[0]).toEqual(expect.objectContaining({ rangeSource: 'mapping', functionSource: 'mapping' }));
    expect(rows[0].values).toEqual(expect.objectContaining({ range: 'NaP', function: 'MFC' }));
    expect(rows[1].values).toEqual(expect.objectContaining({ range: 'Existing Range', function: 'Existing Function' }));
    expect(rows[2].values).toEqual(expect.objectContaining({ range: '', function: '' }));
    expect(repository.saveMappingsAndUpdateRows).toHaveBeenCalledWith(
      'batch-id',
      'account-id',
      { organizationalUnit: 'NaP/MFC15', range: 'NaP', function: 'MFC' },
      rows,
    );
  });
});
