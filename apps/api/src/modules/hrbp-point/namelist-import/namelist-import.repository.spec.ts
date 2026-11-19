import { DatabaseService } from '../../../database/database.service';
import { MrmCalculationService } from '../../mrm/mrm-calculation.service';
import { NamelistImportRepository } from './namelist-import.repository';

describe('NamelistImportRepository month handling', () => {
  it('loads preview months as timezone-neutral year-month strings', async () => {
    const query = jest.fn()
      .mockResolvedValueOnce({
        rows: [{
          preview_id: 'preview-id',
          file_name: 'PS_Namelist_Cleaned_2026-Oct.xlsx',
          reporting_month: '2026-10',
          import_mode: 'live',
          total_rows: 1490,
          valid_rows: 1490,
          invalid_rows: 0,
        }],
      })
      .mockResolvedValueOnce({ rows: [{ exists: false }] });
    const repository = new NamelistImportRepository(
      { query } as unknown as DatabaseService,
      {} as MrmCalculationService,
    );

    await expect(repository.getSummary('preview-id', 'account-id')).resolves.toMatchObject({
      reportingMonth: '2026-10',
    });
    expect(query.mock.calls[0][0]).toContain(
      "TO_CHAR(reporting_month, 'YYYY-MM') AS reporting_month",
    );
    expect(query.mock.calls[1][1]).toEqual(['2026-10-01']);
  });

  it('keeps retention union values as dates and formats only the result month', async () => {
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('FROM public.namelist_import_previews')) {
        return {
          rows: [{
            preview_id: 'preview-id',
            file_name: 'PS_Namelist_Cleaned_2026-Oct.xlsx',
            reporting_month: '2026-10',
            import_mode: 'live',
            total_rows: 1490,
            valid_rows: 1490,
            invalid_rows: 0,
          }],
        };
      }
      if (sql.includes('SELECT EXISTS')) return { rows: [{ exists: false }] };
      if (sql.includes('SELECT id::text')) return { rows: [] };
      if (sql.includes('INSERT INTO public.namelist_imports')) return { rows: [{ id: '1' }] };
      return { rows: [] };
    });
    const database = {
      transaction: (operation: (client: { query: typeof query }) => Promise<number>) =>
        operation({ query }),
    };
    const repository = new NamelistImportRepository(
      database as unknown as DatabaseService,
      {} as MrmCalculationService,
    );

    await expect(repository.commit('preview-id', 'account-id', false)).resolves.toBe(1490);

    const retentionSql = query.mock.calls
      .map(([sql]) => sql)
      .find((sql) => sql.includes('WITH current_live AS'));
    expect(retentionSql).toMatch(/WITH current_live AS \(\s*SELECT reporting_month/);
    expect(retentionSql).toContain(
      "SELECT TO_CHAR(reporting_month, 'YYYY-MM') AS reporting_month",
    );
  });
});
