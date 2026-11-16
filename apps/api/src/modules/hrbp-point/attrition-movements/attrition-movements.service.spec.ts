import { BadRequestException, ConflictException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import ExcelJS from 'exceljs';
import type { AttritionMovementsRepository } from './attrition-movements.repository';
import { AttritionMovementsService } from './attrition-movements.service';

function repositoryMock() {
  return {
    list: jest.fn(),
    dismissCandidate: jest.fn(),
    getPendingCandidate: jest.fn(),
    confirmPendingCandidate: jest.fn(),
    getConfirmedExportRows: jest.fn(),
    recordExport: jest.fn(),
  };
}

describe('AttritionMovementsService', () => {
  it('uses the all-records view and default pagination', async () => {
    const repository = repositoryMock();
    repository.list.mockResolvedValue({ items: [], total: 0 });
    const service = new AttritionMovementsService(repository as unknown as AttritionMovementsRepository);

    await service.list();

    expect(repository.list).toHaveBeenCalledWith('all', '', null, null, 1, 25);
  });

  it('normalizes the selected view and all filters', async () => {
    const repository = repositoryMock();
    repository.list.mockResolvedValue({ items: [], total: 0 });
    const service = new AttritionMovementsService(repository as unknown as AttritionMovementsRepository);

    await service.list('within_ps', ' 3065 ', '2026', '7', '2', '50');

    expect(repository.list).toHaveBeenCalledWith('within_ps', '3065', 2026, 7, 2, 50);
  });

  it('rejects invalid views, periods, searches, and pagination', async () => {
    const service = new AttritionMovementsService(repositoryMock() as unknown as AttritionMovementsRepository);

    await expect(service.list('departures')).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.list('all', '', '1999')).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.list('all', '', '2026', '13')).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.list('all', 'x'.repeat(101))).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.list('all', '', '', '', '0')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('audits dismissal through the repository', async () => {
    const repository = repositoryMock();
    repository.dismissCandidate.mockResolvedValue(true);
    const service = new AttritionMovementsService(repository as unknown as AttritionMovementsRepository);

    await service.dismissCandidate('d290f1ee-6c54-4b01-90e6-d701748f0851', 'account-id');

    expect(repository.dismissCandidate).toHaveBeenCalledWith('d290f1ee-6c54-4b01-90e6-d701748f0851', 'account-id');
  });

  it('rejects an invalid candidate ID', async () => {
    const service = new AttritionMovementsService(repositoryMock() as unknown as AttritionMovementsRepository);

    await expect(service.dismissCandidate('invalid', 'account-id')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('normalizes and confirms a pending candidate', async () => {
    const repository = repositoryMock();
    repository.confirmPendingCandidate.mockResolvedValue({ status: 'confirmed', eventId: 'event-id' });
    const service = new AttritionMovementsService(repository as unknown as AttritionMovementsRepository);
    const candidateId = 'd290f1ee-6c54-4b01-90e6-d701748f0851';

    await expect(service.confirmPendingCandidate(candidateId, {
      exitLwd: '2026-01-31',
      movementType: 'transfer',
      exitReason: '  Relocation  ',
      notes: '  Confirmed by HRBP  ',
    }, 'account-id')).resolves.toEqual({ eventId: 'event-id' });

    expect(repository.confirmPendingCandidate).toHaveBeenCalledWith(candidateId, {
      exitLwd: '2026-01-31',
      movementType: 'transfer',
      exitReason: 'Relocation',
      notes: 'Confirmed by HRBP',
    }, 'account-id');
  });

  it('validates manual confirmation fields', async () => {
    const service = new AttritionMovementsService(repositoryMock() as unknown as AttritionMovementsRepository);
    const candidateId = 'd290f1ee-6c54-4b01-90e6-d701748f0851';

    await expect(service.confirmPendingCandidate(candidateId, { exitLwd: '2026-02-30', movementType: 'resignation', exitReason: 'Reason' }, 'actor')).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.confirmPendingCandidate(candidateId, { exitLwd: '2999-01-01', movementType: 'resignation', exitReason: 'Reason' }, 'actor')).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.confirmPendingCandidate(candidateId, { exitLwd: '2026-01-01', movementType: 'other', exitReason: 'Reason' }, 'actor')).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.confirmPendingCandidate(candidateId, { exitLwd: '2026-01-01', movementType: 'retirement', exitReason: ' ' }, 'actor')).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.confirmPendingCandidate(candidateId, { exitLwd: '2026-01-01', movementType: 'retirement', exitReason: 'Reason', notes: 'x'.repeat(1001) }, 'actor')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('maps repository confirmation outcomes to 404 and 409', async () => {
    const repository = repositoryMock();
    const service = new AttritionMovementsService(repository as unknown as AttritionMovementsRepository);
    const candidateId = 'd290f1ee-6c54-4b01-90e6-d701748f0851';
    const input = { exitLwd: '2026-01-01', movementType: 'resignation', exitReason: 'Reason' };

    repository.confirmPendingCandidate.mockResolvedValueOnce({ status: 'not_found' });
    await expect(service.confirmPendingCandidate(candidateId, input, 'actor')).rejects.toBeInstanceOf(NotFoundException);
    repository.confirmPendingCandidate.mockResolvedValueOnce({ status: 'conflict' });
    await expect(service.confirmPendingCandidate(candidateId, input, 'actor')).rejects.toBeInstanceOf(ConflictException);
  });

  it('exports all confirmed movements with summary and audit metadata', async () => {
    const repository = repositoryMock();
    repository.getConfirmedExportRows.mockResolvedValue([{
      eventId: 'd290f1ee-6c54-4b01-90e6-d701748f0851',
      persNo: '00012345',
      employeeName: 'Example Employee',
      eventMonth: '2026-08-01',
      exitLwd: '2026-07-31',
      eventType: 'resignation',
      transferType: null,
      withinPsType: null,
      countsAsPsAttrition: true,
      classificationStatus: 'confirmed',
      source: 'ps_exit',
      exitReason: 'Personal reasons',
      oldOrganisationalAreaPa: 'Plant A',
      newOrganisationalAreaPa: null,
      oldOrganizationalUnit: 'Unit A',
      newOrganizationalUnit: null,
      oldRange: 'Range A',
      newRange: null,
      oldRangeType: 'plant',
      newRangeType: null,
      notes: null,
      isReviewed: false,
      createdAt: '2026-08-02T08:00:00.000Z',
      updatedAt: '2026-08-02T08:00:00.000Z',
    }]);
    const service = new AttritionMovementsService(repository as unknown as AttritionMovementsRepository);

    const result = await service.exportConfirmedHistory('account-id');

    expect(result.fileName).toMatch(/^PS_Confirmed_Attrition_All_History_.*\.xlsx$/);
    expect(repository.recordExport).toHaveBeenCalledWith(
      'account-id',
      1,
      result.fileName,
      expect.stringMatching(/^[0-9a-f]{64}$/),
    );
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(result.buffer);
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual(['Summary', 'Confirmed Movements']);
    expect(workbook.getWorksheet('Summary')?.getCell('B2').value).toBe(1);
    const movements = workbook.getWorksheet('Confirmed Movements');
    expect(movements?.getRow(1).values).toEqual([
      undefined,
      'Pers.No',
      'Employee Name',
      'Event Month',
      'Last Working Day',
      'Event Type',
      'Transfer Type',
      'Within-PS Type',
      'Exit Reason',
      'Previous Area',
      'Current Area',
      'Previous Org Unit',
      'Current Org Unit',
      'Previous Range',
      'Current Range',
      'Previous Range Type',
      'Current Range Type',
      'Notes',
    ]);
    expect(movements?.getCell('A2').value).toBe('00012345');
    expect(movements?.getCell('B2').value).toBe('Example Employee');
    expect(movements?.getCell('A2').numFmt).toBe('@');
    expect(movements?.getCell('C2').numFmt).toBe('mmm yyyy');
    expect(movements?.getCell('D2').numFmt).toBe('dd mmm yyyy');
  });

  it('rejects exports above the workbook row limit before recording an audit', async () => {
    const repository = repositoryMock();
    repository.getConfirmedExportRows.mockResolvedValue(new Array(100_001).fill({}));
    const service = new AttritionMovementsService(repository as unknown as AttritionMovementsRepository);

    await expect(service.exportConfirmedHistory('account-id')).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.recordExport).not.toHaveBeenCalled();
  });

  it('does not return a file when audit recording fails', async () => {
    const repository = repositoryMock();
    repository.getConfirmedExportRows.mockResolvedValue([]);
    repository.recordExport.mockRejectedValue(new Error('audit unavailable'));
    const service = new AttritionMovementsService(repository as unknown as AttritionMovementsRepository);

    await expect(service.exportConfirmedHistory('account-id')).rejects.toBeInstanceOf(InternalServerErrorException);
  });
});