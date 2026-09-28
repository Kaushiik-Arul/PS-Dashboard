import { ConflictException } from '@nestjs/common';
import type { EmployeeJdImportRepository } from './employee-jd-import.repository';
import { EmployeeJdImportService } from './employee-jd-import.service';

const actorAccountId = 'ea599947-cedc-453c-99ba-20cdef44933b';

describe('EmployeeJdImportService', () => {
  it('resolves an imported JD ID by its final three characters', async () => {
    const repository = {
      getAllRows: jest.fn().mockResolvedValue([{
        rowNumber: 2,
        values: { pers_no: '11971004', jd_id: 'PSAFASP004' },
        issues: [],
      }]),
      getKnownPersNos: jest.fn().mockResolvedValue(new Set(['11971004'])),
      getKnownJdIds: jest.fn().mockResolvedValue(new Map([['004', 'MASTER-JD-004']])),
      replaceRows: jest.fn().mockResolvedValue(undefined),
      getSummary: jest.fn().mockResolvedValue({
        id: 'preview-id',
        fileName: 'employee-jd.xlsx',
        totalRows: 1,
        validRows: 1,
        invalidRows: 0,
        hasExistingAssignments: true,
      }),
    };
    const service = new EmployeeJdImportService(repository as unknown as EmployeeJdImportRepository);

    await service.updateRow(
      'preview-id',
      '2',
      { pers_no: '11971004', jd_id: 'PSAFASP004' },
      actorAccountId,
    );

    expect(repository.getKnownJdIds).toHaveBeenCalledWith(['004']);
    expect(repository.replaceRows).toHaveBeenCalledWith('preview-id', actorAccountId, [{
      rowNumber: 2,
      values: { pers_no: '11971004', jd_id: 'MASTER-JD-004' },
      issues: [],
    }]);
  });

  it('deletes a selected preview row', async () => {
    const repository = { deleteRow: jest.fn().mockResolvedValue(true) };
    const service = new EmployeeJdImportService(repository as unknown as EmployeeJdImportRepository);

    await service.deleteRow('preview-id', '420', actorAccountId);

    expect(repository.deleteRow).toHaveBeenCalledWith('preview-id', actorAccountId, 420);
  });

  it('does not allow deleting the final preview row', async () => {
    const repository = { deleteRow: jest.fn().mockRejectedValue(new Error('LAST_PREVIEW_ROW')) };
    const service = new EmployeeJdImportService(repository as unknown as EmployeeJdImportRepository);

    await expect(service.deleteRow('preview-id', '2', actorAccountId))
      .rejects.toBeInstanceOf(ConflictException);
  });
});