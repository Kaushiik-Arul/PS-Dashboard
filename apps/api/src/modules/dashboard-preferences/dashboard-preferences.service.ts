import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import {
  defaultOverviewWidgetIds,
  overviewWidgetIdSet,
} from './dashboard-widget.catalog';
import { DashboardPreferencesRepository } from './dashboard-preferences.repository';

export type OverviewPreferenceResponse = {
  widgetIds: string[];
  isDefault: boolean;
};

@Injectable()
export class DashboardPreferencesService {
  private readonly logger = new Logger(DashboardPreferencesService.name);

  constructor(private readonly repository: DashboardPreferencesRepository) {}

  async getOverview(accountId: string): Promise<OverviewPreferenceResponse> {
    try {
      const widgetIds = await this.repository.getOverviewWidgetIds(accountId);
      return widgetIds === null
        ? { widgetIds: [...defaultOverviewWidgetIds], isDefault: true }
        : { widgetIds, isDefault: false };
    } catch (error) {
      this.logError('load', error);
      throw new InternalServerErrorException('Unable to load Overview preferences');
    }
  }

  async saveOverview(accountId: string, body: unknown): Promise<OverviewPreferenceResponse> {
    const widgetIds = this.parseWidgetIds(body);
    try {
      await this.repository.saveOverviewWidgetIds(accountId, widgetIds);
      return { widgetIds, isDefault: false };
    } catch (error) {
      this.logError('save', error);
      throw new InternalServerErrorException('Unable to save Overview preferences');
    }
  }

  async resetOverview(accountId: string): Promise<OverviewPreferenceResponse> {
    try {
      await this.repository.resetOverview(accountId);
      return { widgetIds: [...defaultOverviewWidgetIds], isDefault: true };
    } catch (error) {
      this.logError('reset', error);
      throw new InternalServerErrorException('Unable to reset Overview preferences');
    }
  }

  private parseWidgetIds(body: unknown): string[] {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new BadRequestException('Overview preferences payload is invalid');
    }
    const widgetIds = (body as Record<string, unknown>).widgetIds;
    if (!Array.isArray(widgetIds) || widgetIds.length > 64) {
      throw new BadRequestException('widgetIds must be an array with at most 64 items');
    }
    if (widgetIds.some((id) => typeof id !== 'string' || !overviewWidgetIdSet.has(id))) {
      throw new BadRequestException('widgetIds contains an unsupported widget');
    }
    if (new Set(widgetIds).size !== widgetIds.length) {
      throw new BadRequestException('widgetIds must not contain duplicates');
    }
    return widgetIds as string[];
  }

  private logError(action: string, error: unknown) {
    this.logger.error(
      `Unable to ${action} Overview preferences`,
      error instanceof Error ? error.stack : String(error),
    );
  }
}
