import { BadRequestException } from '@nestjs/common';
import { TalentPipelineRepository } from './talent-pipeline.repository';
import { TalentPipelineService } from './talent-pipeline.service';
import type { TalentPipelineResponseDto } from './dto/talent-pipeline-response.dto';

describe('TalentPipelineService', () => {
  const getTalentPipeline = jest.fn();
  const repository = { getTalentPipeline } as unknown as TalentPipelineRepository;
  const service = new TalentPipelineService(repository);

  beforeEach(() => getTalentPipeline.mockReset());

  it('forwards normalized filters and the authenticated account', async () => {
    const response = {} as TalentPipelineResponseDto;
    getTalentPipeline.mockResolvedValue(response);
    await expect(
      service.getTalentPipeline({ range: '  PS/CA-IN  ' }, 'account-id'),
    ).resolves.toBe(response);
    expect(getTalentPipeline).toHaveBeenCalledWith(
      {
        functionName: null,
        orgUnit: null,
        range: 'PS/CA-IN',
        location: null,
        gender: null,
        directOrIndirect: null,
      },
      'account-id',
    );
  });

  it('rejects invalid filters before querying the database', async () => {
    await expect(
      service.getTalentPipeline({ range: 42 as never }, 'account-id'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(getTalentPipeline).not.toHaveBeenCalled();
  });
});