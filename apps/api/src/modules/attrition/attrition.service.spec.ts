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
          org_unit: 'Engineering', range: 'R1', range2: 'R2A', initiated_date: '', lwd: '10.01.2025',
          lwd_year: 2025, lwd_month: 1, e_separation_request_no: '', to_org_unit: '',
        },
        {
          id: '2', pers_no: '1002', employee_name: 'B', ps_group: '', gender_key: 'Male',
          filter_value: 'Transfer', reason_for_action: 'Resignation', detailed_reason_approved: 'Internal move',
          org_unit: 'Engineering', range: 'R1', range2: 'R2A', initiated_date: '', lwd: '20.01.2025',
          lwd_year: 2025, lwd_month: 1, e_separation_request_no: '', to_org_unit: '',
        },
        {
          id: '3', pers_no: '1003', employee_name: 'C', ps_group: '', gender_key: 'Female',
          filter_value: 'Exit', reason_for_action: 'Resignation', detailed_reason_approved: 'Career growth',
          org_unit: 'Sales', range: 'R2', range2: 'R2B', initiated_date: '', lwd: '05.02.2025',
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
      range2: ['R2A', 'R2B'],
      reasonForAction: [' Retirement ', 'Resignation'],
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
    expect(response.filterOptions.reasonForAction).toEqual(['Resignation', 'Retirement']);
    expect(response.filterOptions.range2).toEqual(['R2A', 'R2B']);
    expect(response.filterOptions).not.toHaveProperty('range');
    expect(response.rows[0]).not.toHaveProperty('lwd_year');

    const rowsSql = String(query.mock.calls[1][0]);
    expect(rowsSql).toContain('FROM public.employee_attrition_events event');
    expect(rowsSql).not.toContain('public.attrition_rows');
    expect(rowsSql).toContain('event.deleted_at IS NULL');
    expect(rowsSql).toContain("event.classification_status = 'confirmed'");
    expect(rowsSql).toContain('event.counts_as_ps_attrition = TRUE');
    expect(rowsSql).toContain("event.event_type IN ('resignation', 'retirement')");
    expect(rowsSql).toContain(
      "event.transfer_type IN ('out_of_ps_within_rbin', 'out_of_ps_out_of_rbin')",
    );
    expect(rowsSql).toContain("event.transfer_type = 'within_ps'");
    expect(rowsSql).toContain('$2::BOOLEAN');
    expect(rowsSql).toContain("WHEN event.transfer_type = 'within_ps' THEN 'Within PS Transfer'");
    expect(query.mock.calls[1][1]).toEqual(['account-id', true]);
    expect(rowsSql).toContain("COALESCE(mapping.range_value, '') AS range");
    expect(rowsSql).toContain("COALESCE(mapping.range_2, '') AS range2");
    expect(rowsSql).toContain('LEFT JOIN public.org_unit_range_mappings mapping');
    expect(rowsSql).toContain(
      "COALESCE(event.old_organizational_unit, '') AS org_unit",
    );
    expect(rowsSql).toContain(
      "BTRIM(COALESCE(event.old_range, '')) = BTRIM(access.assigned_range)",
    );
    expect(rowsSql).toContain(
      "BTRIM(COALESCE(event.old_organizational_unit, '')) = BTRIM(access.assigned_org_unit)",
    );
    expect(rowsSql).toContain(
      "COALESCE(event.new_organizational_unit, '') AS to_org_unit",
    );
    expect(rowsSql).toContain(
      "COALESCE(TO_CHAR(event.exit_lwd, 'DD.MM.YYYY'), '') AS lwd",
    );
    expect(rowsSql).toContain(
      'EXTRACT(YEAR FROM COALESCE(event.exit_lwd, event.event_month))::INTEGER AS lwd_year',
    );
    expect(rowsSql).toContain(
      'EXTRACT(MONTH FROM COALESCE(event.exit_lwd, event.event_month))::INTEGER AS lwd_month',
    );
    const headcountSql = String(query.mock.calls[3][0]);
    expect(headcountSql).toContain('FROM public.org_unit_range_mappings');
    expect(headcountSql).toContain('mapping.range2_key = ANY($3::TEXT[])');
    expect(headcountSql).not.toContain('mapping.range_key = ANY');
    expect(query.mock.calls[3][1]).toEqual([
      'account-id',
      [2025, 2026],
      ['R2A', 'R2B'],
    ]);
  });

  it('keeps within-PS transfers excluded when Personal Range is not narrowed', async () => {
    query
      .mockResolvedValueOnce(result([{ revision: '1', file_name: null, imported_at: null }]))
      .mockResolvedValueOnce(result([]))
      .mockResolvedValueOnce(result([{ unrestricted: true, range_scoped: false }]))
      .mockResolvedValueOnce(result([]));

    await service.getDashboard('account-id', { year: '2025' });

    expect(query.mock.calls[1][1]).toEqual(['account-id', false]);
    expect(String(query.mock.calls[1][0])).toContain(
      "AND event.transfer_type = 'within_ps'",
    );
  });

  it('rejects an unknown separation type before querying data', async () => {
    await expect(service.getDashboard('account-id', {
      separationType: 'Dismissal',
    })).rejects.toBeInstanceOf(BadRequestException);

    expect(query).not.toHaveBeenCalled();
  });
});