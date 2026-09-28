import { BadRequestException, ConflictException } from '@nestjs/common';
import type { JobDescriptionsRepository } from './job-descriptions.repository';
import { JobDescriptionsService } from './job-descriptions.service';

const actorAccountId = 'ea599947-cedc-453c-99ba-20cdef44933b';

function repositoryMock() {
  return { list: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() };
}

describe('JobDescriptionsService', () => {
  it('normalizes JD IDs and trims role titles', async () => {
    const repository = repositoryMock();
    repository.create.mockResolvedValue({ id: 'id', jdId: 'JD-101', roleTitle: 'Engineer', updatedAt: '' });
    const service = new JobDescriptionsService(repository as unknown as JobDescriptionsRepository);

    await service.create({ jdId: ' jd-101 ', roleTitle: ' Engineer ' }, actorAccountId);

    expect(repository.create).toHaveBeenCalledWith({ jdId: 'JD-101', roleTitle: 'Engineer' }, actorAccountId);
  });

  it('rejects incomplete input', async () => {
    const service = new JobDescriptionsService(repositoryMock() as unknown as JobDescriptionsRepository);

    expect(() => service.create({ jdId: 'JD-101' }, actorAccountId)).toThrow(BadRequestException);
  });

  it('maps unique-key failures to a duplicate conflict', async () => {
    const repository = repositoryMock();
    repository.create.mockRejectedValue({ code: '23505' });
    const service = new JobDescriptionsService(repository as unknown as JobDescriptionsRepository);

    await expect(service.create({ jdId: 'JD-101', roleTitle: 'Engineer' }, actorAccountId))
      .rejects.toBeInstanceOf(ConflictException);
  });
});