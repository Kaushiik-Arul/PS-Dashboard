import { BadRequestException, HttpException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { AttritionMovementsRepository } from './attrition-movements.repository';
import {
  attritionMovementViews,
  type AttritionMovementsPage,
  type AttritionMovementView,
} from './attrition-movements.types';

@Injectable()
export class AttritionMovementsService {
  private readonly logger = new Logger(AttritionMovementsService.name);

  constructor(private readonly repository: AttritionMovementsRepository) {}

  async list(
    viewInput?: string,
    searchInput?: string,
    yearInput?: string,
    monthInput?: string,
    pageInput?: string,
    pageSizeInput?: string,
  ): Promise<AttritionMovementsPage> {
    const view = (viewInput?.trim() || 'all') as AttritionMovementView;
    if (!attritionMovementViews.includes(view)) throw new BadRequestException('Attrition movement view is invalid.');
    const search = searchInput?.trim() ?? '';
    if (search.length > 100) throw new BadRequestException('Search must not exceed 100 characters.');
    const year = this.optionalInteger(yearInput, 'Year', 2000, 2100);
    const month = this.optionalInteger(monthInput, 'Month', 1, 12);
    const page = this.positiveInteger(pageInput, 1, 1_000_000);
    const pageSize = this.positiveInteger(pageSizeInput, 25, 100);
    return this.run(
      () => this.repository.list(view, search, year, month, page, pageSize),
      'Unable to load attrition movements',
    );
  }

  async dismissCandidate(candidateId: string, actor: string): Promise<void> {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(candidateId)) {
      throw new BadRequestException('Invalid departure candidate ID.');
    }
    const dismissed = await this.run(
      () => this.repository.dismissCandidate(candidateId, actor),
      'Unable to dismiss the departure candidate',
    );
    if (!dismissed) throw new NotFoundException('Pending departure candidate was not found.');
  }

  private optionalInteger(value: string | undefined, label: string, minimum: number, maximum: number): number | null {
    if (value === undefined || value.trim() === '') return null;
    if (!/^\d+$/.test(value)) throw new BadRequestException(`${label} must be a whole number.`);
    const parsed = Number(value);
    if (parsed < minimum || parsed > maximum) throw new BadRequestException(`${label} must be between ${minimum} and ${maximum}.`);
    return parsed;
  }

  private positiveInteger(value: string | undefined, fallback: number, maximum: number): number {
    if (value === undefined) return fallback;
    if (!/^\d+$/.test(value)) throw new BadRequestException('Pagination values must be positive whole numbers.');
    const parsed = Number(value);
    if (parsed < 1 || parsed > maximum) throw new BadRequestException(`Pagination value must be between 1 and ${maximum}.`);
    return parsed;
  }

  private async run<Result>(operation: () => Promise<Result>, message: string): Promise<Result> {
    try { return await operation(); } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(message);
      throw new InternalServerErrorException(message);
    }
  }
}