import ExcelJS from 'exceljs';
import {
  parseSuccessionPlanningFile,
  validateSuccessionPlanningRows,
} from './succession-planning-import.parser';
import {
  emptySuccessionPlanningValues,
  type SuccessionPlanningRow,
} from './succession-planning-import.types';

function row(): SuccessionPlanningRow {
  return {
    rowNumber: 3,
    values: {
      ...emptySuccessionPlanningValues(),
      position_jd_id: '123',
      incumbent_pers_no: '1001',
      incumbent_name: 'Example Person',
    },
    issues: [],
  };
}

const jdLookup = {
  matches: new Map([['123', 'PSEN00123']]),
  ambiguousSuffixes: new Set<string>(),
};

describe('Succession Planning workbook parsing', () => {
  it('detects the leaf header below grouped headings and ignores SL no', async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Succession Planning');
    sheet.addRow(['', '', '', 'Position Listing', '', '', '', '', 'Priority', 'Current Incumbent']);
    sheet.addRow([
      'SL no', 'Entity', 'Updated By', 'RP | FC | MG', 'JDID', 'JD Name',
      'IPE Level', 'E Sub grp', 'Critical / Niche / General', 'High |Medium| Low',
      'E.No.', 'Name', 'Org Unit', 'Range', 'In current position since (Years)',
      'Age', 'Incumbent change Expected (Year)', '9 Box Rating (2024,2025,2026)',
      'Reason for change', 'Employee Number 1', 'Successor 1', 'Current Dept Code 1',
      'Current JDID 1', 'Readiness 1', '9 Box Rating 1',
      'IDP In HR Global (Development Dialog Form)1', 'Employee Number 2',
      'Successor 2', 'Current Dept Code 2', 'Current JDID 2', 'Readiness 2',
      '9 Box Rating 2', 'IDP In HR Global (Development Dialog Form)2',
    ]);
    sheet.addRow(['1', 'PS', 'Uploader', 'RP', '123', 'Position', '', '', 'Critical', 'High', '1001', 'Example Person']);
    const buffer = await workbook.xlsx.writeBuffer();
    const rows = await parseSuccessionPlanningFile({
      originalname: 'succession.xlsx',
      buffer: Buffer.from(buffer),
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].rowNumber).toBe(3);
    expect(rows[0].values.position_jd_id).toBe('123');
    expect(rows[0].values.incumbent_pers_no).toBe('1001');
    expect('sl_no' in rows[0].values).toBe(false);
  });
});

describe('Succession Planning validation', () => {
  it('accepts blank successor groups and canonicalizes the position JDID', () => {
    const [result] = validateSuccessionPlanningRows([row()], jdLookup);
    expect(result.issues).toEqual([]);
    expect(result.values.position_jd_id).toBe('PSEN00123');
  });

  it('does not block values that are absent from reference data', () => {
    const input = row();
    input.values.incumbent_pers_no = '9999';
    input.values.position_jd_id = 'UNKNOWN';
    const [result] = validateSuccessionPlanningRows([input], jdLookup);
    expect(result.issues).toEqual([]);
    expect(result.values.position_jd_id).toBe('UNKNOWN');
  });

  it('allows two occurrences split across both successor columns', () => {
    const input = row();
    input.values.successor1_pers_no = '2001';
    input.values.successor2_pers_no = '2001';
    const [result] = validateSuccessionPlanningRows([input], jdLookup);
    expect(result.issues).toEqual([]);
  });

  it('warns on every occurrence when a successor appears more than twice', () => {
    const rows = [row(), row(), row()];
    rows.forEach((input, index) => {
      input.rowNumber = index + 3;
      input.values.successor1_pers_no = '2001';
    });
    const results = validateSuccessionPlanningRows(rows, jdLookup);
    expect(results.every((result) => result.issues.length === 1)).toBe(true);
    expect(results[0].issues[0]).toEqual({
      column: 'successor1_pers_no',
      employeeNumber: '2001',
      message: 'Employee appears 3 times as a successor; maximum recommended is 2.',
      severity: 'warning',
      occurrences: 3,
    });
  });

  it('counts each employee number in a multi-value successor cell', () => {
    const rows = [row(), row(), row()];
    rows.forEach((input, index) => {
      input.rowNumber = index + 3;
      input.values.successor1_pers_no = '2001 / 3001';
    });
    const results = validateSuccessionPlanningRows(rows, jdLookup);
    expect(results[0].issues.map((issue) => issue.employeeNumber)).toEqual([
      '2001',
      '3001',
    ]);
  });
});
