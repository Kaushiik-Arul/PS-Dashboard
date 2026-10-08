import { BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { AttritionService } from './attrition.service';

function result<Row>(rows: Row[]) {
  return { rows, rowCount: rows.length };
}

describe('AttritionService', () => {
  let query: jest.Mock;
  let service: AttritionService;

  beforeEach(() => {
    query = jest.fn();
    const database = { query } as unknown as DatabaseService;
    service = new AttritionService(database);
  });

  it('builds filtered KPIs and monthly rates with separation precedence', async () => {
    query
      .mockResolvedValueOnce(result([{
        revision: '3',
        file_name: 'Attrition.xlsx',
        imported_at: '2025-03-01T00:00:00Z',
      }]))
      .mockResolvedValueOnce(result([
        {
          id: '1', pers_no: '1001', employee_name: 'A', ps_group: '', gender_key: 'Male',
          filter_value: 'Separation', reason_for_action: 'Retirement', detailed_reason_approved: 'Age',
          org_unit: 'Engineering', range: 'R1', initiated_date: '', lwd: '10.01.2025',
          lwd_year: 2025, lwd_month: 1, e_separation_request_no: '', to_org_unit: '',
        },
        {
          id: '2', pers_no: '1002', employee_name: 'B', ps_group: '', gender_key: 'Male',
          filter_value: 'Transfer', reason_for_action: 'Resignation', detailed_reason_approved: 'Internal move',
          org_unit: 'Engineering', range: 'R1', initiated_date: '', lwd: '20.01.2025',
          lwd_year: 2025, lwd_month: 1, e_separation_request_no: '', to_org_unit: '',
        },
        {
          id: '3', pers_no: '1003', employee_name: 'C', ps_group: '', gender_key: 'Female',
          filter_value: 'Exit', reason_for_action: '', detailed_reason_approved: 'Career growth',
          org_unit: 'Sales', range: 'R2', initiated_date: '', lwd: '05.02.2025',
          lwd_year: 2025, lwd_month: 2, e_separation_request_no: '', to_org_unit: '',
        },
      ]))
      .mockResolvedValueOnce(result([{ unrestricted: true, range_scoped: false }]))
      .mockResolvedValueOnce(result([
        { month: 1, headcount: '100' },
        { month: 2, headcount: '200' },
      ]));

    const response = await service.getDashboard('account-id', {
      year: ['2025', '2026'],
      separationType: ['Resignation', 'Transfer', 'Retirement'],
      range: ['R1', 'R2'],
      orgUnit: ['Engineering', 'Sales'],
    });

    expect(response.organizationScope).toBe('unrestricted');
    expect(response.selectedYears).toEqual([2025, 2026]);
    expect(response.kpis).toMatchObject({
      total: 3,
      resignations: 1,
      transfers: 1,
      retirements: 1,
      female: 1,
      averageHeadcount: 150,
      attritionRate: 2,
    });
    expect(response.trend[0]).toEqual({ month: 1, count: 2, headcount: 100, rate: 2 });
    expect(response.trend[1]).toEqual({ month: 2, count: 1, headcount: 200, rate: 0.5 });
    expect(response.trend[2]).toEqual({ month: 3, count: 0, headcount: null, rate: null });
    expect(response.reasons).toEqual([
      { label: 'Age', value: 1 },
      { label: 'Career growth', value: 1 },
      { label: 'Internal move', value: 1 },
    ]);
    expect(response.filterOptions.separationType).toEqual([
      'Resignation', 'Transfer', 'Retirement',
    ]);
    expect(response.rows[0]).not.toHaveProperty('lwd_year');
    expect(query.mock.calls[3][1]).toEqual([
      'account-id',
      [2025, 2026],
      ['R1', 'R2'],
      ['ENGINEERING', 'SALES'],
    ]);
  });

  it('rejects an unknown separation type before querying data', async () => {
    await expect(service.getDashboard('account-id', {
      separationType: 'Dismissal',
    })).rejects.toBeInstanceOf(BadRequestException);

    expect(query).not.toHaveBeenCalled();
  });
});