import { BadRequestException } from '@nestjs/common';
import type { AttritionMovementsRepository } from './attrition-movements.repository';
import { AttritionMovementsService } from './attrition-movements.service';

function repositoryMock() {
  return { list: jest.fn(), dismissCandidate: jest.fn() };
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
});