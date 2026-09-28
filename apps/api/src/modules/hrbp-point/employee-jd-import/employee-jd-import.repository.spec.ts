import type { DatabaseService } from '../../../database/database.service';
import { EmployeeJdImportRepository } from './employee-jd-import.repository';

describe('EmployeeJdImportRepository.deleteRow', () => {
  it.each([
    { otherIssues: [], expectedValid: true },
    { otherIssues: [{ column: 'jd_id', message: 'JD ID suffix does not uniquely match the JD master.' }], expectedValid: false },
  ])('rechecks the remaining duplicate without removing other errors ($expectedValid)', async ({ otherIssues, expectedValid }) => {
    const duplicate = { column: 'pers_no', message: 'Employee number is duplicated in this workbook.' };
    const client = { query: jest.fn(async (sql: string, _params?: unknown[]) => {
      if (sql.includes('SELECT total_rows FROM')) return { rows: [{ total_rows: 2 }] };
      if (sql.includes('DELETE FROM public.employee_jd_import_preview_rows')) return { rows: [{ row_data: { pers_no: '30657593', jd_id: 'PSQMBPP021' } }] };
      if (sql.includes('SELECT row_number, row_data, issues')) return { rows: [{ row_number: 1443, row_data: { pers_no: '30657593', jd_id: 'PSQMBPP021' }, issues: [duplicate, ...otherIssues] }] };
      return { rows: [] };
    }) };
    const database = { transaction: jest.fn(async (callback: (connection: typeof client) => Promise<unknown>) => callback(client)) };
    const repository = new EmployeeJdImportRepository(database as unknown as DatabaseService);

    await expect(repository.deleteRow('preview-id', 'actor-id', 1035)).resolves.toBe(true);

    const update = client.query.mock.calls.find((call) => call[0].includes('SET issues = $3::JSONB'));
    expect(update).toBeDefined();
    expect(update?.[1]).toEqual(['preview-id', 1443, JSON.stringify(otherIssues), expectedValid]);
    expect(client.query.mock.calls.some((call) => call[0].includes('COUNT(*) FILTER (WHERE is_valid)'))).toBe(true);
  });
});
