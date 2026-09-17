import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { OverviewResponseDto } from './dto/overview-response.dto';
import { OverviewRepository } from './overview.repository';

@Injectable()
export class OverviewService {
  private readonly logger = new Logger(OverviewService.name);

  constructor(private readonly repository: OverviewRepository) {}

  async getOverview(): Promise<OverviewResponseDto> {
    try {
      return await this.repository.getOverview();
    } catch {
      this.logger.error('Overview database query failed');
      throw new InternalServerErrorException(
        'Unable to load the workforce overview',
      );
    }
  }
}