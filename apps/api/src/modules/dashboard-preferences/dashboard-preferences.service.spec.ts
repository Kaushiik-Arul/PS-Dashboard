import { BadRequestException } from '@nestjs/common';
import { defaultOverviewWidgetIds } from './dashboard-widget.catalog';
import { DashboardPreferencesRepository } from './dashboard-preferences.repository';
import { DashboardPreferencesService } from './dashboard-preferences.service';

describe('DashboardPreferencesService', () => {
  const getOverviewWidgetIds = jest.fn();
  const saveOverviewWidgetIds = jest.fn();
  const resetOverview = jest.fn();
  const repository = {
    getOverviewWidgetIds,
    saveOverviewWidgetIds,
    resetOverview,
  } as unknown as DashboardPreferencesRepository;
  const service = new DashboardPreferencesService(repository);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns recommended defaults when the account has no saved layout', async () => {
    getOverviewWidgetIds.mockResolvedValue(null);

    await expect(service.getOverview('account-a')).resolves.toEqual({
      widgetIds: [...defaultOverviewWidgetIds],
      isDefault: true,
    });
    expect(getOverviewWidgetIds).toHaveBeenCalledWith('account-a');
  });

  it('preserves an intentionally empty saved layout', async () => {
    getOverviewWidgetIds.mockResolvedValue([]);

    await expect(service.getOverview('account-a')).resolves.toEqual({
      widgetIds: [],
      isDefault: false,
    });
  });

  it('saves ordered widgets for only the authenticated account', async () => {
    saveOverviewWidgetIds.mockResolvedValue(undefined);
    const widgetIds = [
      'succession.kpi.total-positions',
      'demographics.kpi.total-hc',
    ];

    await expect(service.saveOverview('account-a', { widgetIds })).resolves.toEqual({
      widgetIds,
      isDefault: false,
    });
    expect(saveOverviewWidgetIds).toHaveBeenCalledWith('account-a', widgetIds);
  });

  it.each([
    [{ widgetIds: ['unsupported.widget'] }, 'unsupported'],
    [{ widgetIds: ['demographics.kpi.total-hc', 'demographics.kpi.total-hc'] }, 'duplicates'],
    [{ widgetIds: new Array(65).fill('demographics.kpi.total-hc') }, 'at most 64'],
  ])('rejects invalid widget selections: %s', async (body, message) => {
    await expect(service.saveOverview('account-a', body)).rejects.toThrow(message);
    await expect(service.saveOverview('account-a', body)).rejects.toBeInstanceOf(BadRequestException);
    expect(saveOverviewWidgetIds).not.toHaveBeenCalled();
  });

  it('resets only the authenticated account layout', async () => {
    resetOverview.mockResolvedValue(undefined);

    await expect(service.resetOverview('account-a')).resolves.toEqual({
      widgetIds: [...defaultOverviewWidgetIds],
      isDefault: true,
    });
    expect(resetOverview).toHaveBeenCalledWith('account-a');
  });
});
