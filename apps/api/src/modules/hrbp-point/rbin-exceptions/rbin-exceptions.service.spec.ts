import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import type { RbinExceptionsRepository } from './rbin-exceptions.repository';
import { RbinExceptionsService } from './rbin-exceptions.service';

function repositoryMock() {
  return { list: jest.fn(), createMany: jest.fn(), update: jest.fn(), delete: jest.fn() };
}

describe('RbinExceptionsService', () => {
  it('lists eight exceptions and validates the column filter', async () => {
    const repository = repositoryMock();
    repository.list.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 8, search: '123', filter: 'range' });
    const service = new RbinExceptionsService(repository as unknown as RbinExceptionsRepository);

    const result = await service.list(' 123 ', 'range');

    expect(repository.list).toHaveBeenCalledWith('123', 'range', 1, 8);
    expect(result.columns).toContainEqual({ key: 'range', label: 'Range' });
    await expect(service.list('', 'pers_no')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates several distinct column rules atomically', async () => {
    const repository = repositoryMock();
    repository.createMany.mockResolvedValue([]);
    const service = new RbinExceptionsService(repository as unknown as RbinExceptionsRepository);

    await service.create({
      persNo: '12345',
      rules: [
        { columnName: 'range', fixedValue: ' Fixed Range ' },
        { columnName: 'official_email', fixedValue: 'fixed@example.com' },
      ],
    }, '00000000-0000-4000-8000-000000000001');

    expect(repository.createMany).toHaveBeenCalledWith('12345', [
      { columnName: 'range', fixedValue: 'Fixed Range' },
      { columnName: 'official_email', fixedValue: 'fixed@example.com' },
    ], '00000000-0000-4000-8000-000000000001');
  });

  it('rejects identity columns and duplicate selections', async () => {
    const service = new RbinExceptionsService(repositoryMock() as unknown as RbinExceptionsRepository);

    await expect(service.create({ persNo: '12345', rules: [{ columnName: 'pers_no', fixedValue: '67890' }] }, 'actor'))
      .rejects.toBeInstanceOf(BadRequestException);
    await expect(service.create({
      persNo: '12345',
      rules: [{ columnName: 'range', fixedValue: 'A' }, { columnName: 'range', fixedValue: 'B' }],
    }, 'actor')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('validates typed fixed values', async () => {
    const service = new RbinExceptionsService(repositoryMock() as unknown as RbinExceptionsRepository);

    await expect(service.create({ persNo: '12345', rules: [{ columnName: 'birth_date', fixedValue: '31/12/2026' }] }, 'actor'))
      .rejects.toBeInstanceOf(BadRequestException);
    await expect(service.create({ persNo: '12345', rules: [{ columnName: 'official_email', fixedValue: 'invalid' }] }, 'actor'))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it('translates duplicate rules to conflict', async () => {
    const repository = repositoryMock();
    repository.createMany.mockRejectedValue({ code: '23505' });
    const service = new RbinExceptionsService(repository as unknown as RbinExceptionsRepository);

    await expect(service.create({ persNo: '12345', rules: [{ columnName: 'range', fixedValue: 'A' }] }, 'actor'))
      .rejects.toBeInstanceOf(ConflictException);
  });

  it('returns not found when updating an unknown exception', async () => {
    const repository = repositoryMock();
    repository.update.mockResolvedValue(null);
    const service = new RbinExceptionsService(repository as unknown as RbinExceptionsRepository);

    await expect(service.update(
      '00000000-0000-4000-8000-000000000001',
      { persNo: '12345', columnName: 'range', fixedValue: 'A' },
      'actor',
    )).rejects.toBeInstanceOf(NotFoundException);
  });
});