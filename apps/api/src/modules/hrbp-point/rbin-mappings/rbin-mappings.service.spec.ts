import { BadRequestException, ConflictException } from '@nestjs/common';
import type { RbinMappingsRepository } from './rbin-mappings.repository';
import { RbinMappingsService } from './rbin-mappings.service';

function repositoryMock() {
  return {
    list: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
}

describe('RbinMappingsService', () => {
  it('lists eight Range mappings by default with independent search', async () => {
    const repository = repositoryMock();
    repository.list.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 8, search: 'nap', filter: '', filterOptions: [] });
    const service = new RbinMappingsService(repository as unknown as RbinMappingsRepository);

    await service.list('ranges', '  nap  ');

    expect(repository.list).toHaveBeenCalledWith('ranges', 'nap', '', 1, 8);
  });

  it('trims a Function filter independently from search', async () => {
    const repository = repositoryMock();
    repository.list.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 8, search: '', filter: 'MG', filterOptions: ['FC', 'MG'] });
    const service = new RbinMappingsService(repository as unknown as RbinMappingsRepository);

    await service.list('functions', undefined, '  MG  ');

    expect(repository.list).toHaveBeenCalledWith('functions', '', 'MG', 1, 8);
  });

  it('rejects filters longer than a mapping value', async () => {
    const service = new RbinMappingsService(repositoryMock() as unknown as RbinMappingsRepository);

    await expect(service.list('ranges', '', 'x'.repeat(201)))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects unsupported mapping types', async () => {
    const service = new RbinMappingsService(repositoryMock() as unknown as RbinMappingsRepository);

    await expect(service.list('combined')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('requires both Organizational Unit and mapped value', async () => {
    const service = new RbinMappingsService(repositoryMock() as unknown as RbinMappingsRepository);

    await expect(service.create('functions', { organizationalUnit: 'PS/MG', value: ' ' }))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a duplicate Organizational Unit mapping', async () => {
    const repository = repositoryMock();
    repository.create.mockResolvedValue(null);
    const service = new RbinMappingsService(repository as unknown as RbinMappingsRepository);

    await expect(service.create('ranges', { organizationalUnit: 'PS/MG', value: 'PS' }))
      .rejects.toBeInstanceOf(ConflictException);
  });
});