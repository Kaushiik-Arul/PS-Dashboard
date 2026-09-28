import { BadRequestException } from '@nestjs/common';
import ExcelJS from 'exceljs';
import { parseStepFile } from './active-step.parser';

async function workbook(rows: unknown[][]) {
  const book = new ExcelJS.Workbook();
  const sheet = book.addWorksheet('STEP');
  rows.forEach((row) => sheet.addRow(row));
  for (const [first, last] of [['H', 'I'], ['J', 'K'], ['L', 'M'], ['N', 'O'], ['P', 'Q'], ['R', 'S']]) sheet.mergeCells(`${first}1:${last}1`);
  return { originalname: 'step.xlsx', buffer: Buffer.from(await book.xlsx.writeBuffer()) };
}
const header = [
  ['Sl No', 'Year', 'E No', 'E Name', 'Group', 'Initiated by (HRBP)', 'Exchanged with', 'STEP Period', '', 'Entity', '', 'GB', '', 'Function', '', 'Dept', '', 'Location', ''],
  ['', '', '', '', '', '', '', 'From', 'To', 'From', 'To', 'From', 'To', 'From', 'To', 'From', 'To', 'From', 'To'],
];

describe('STEP Excel parser', () => {
  it('reads a merged two-row header, real dates, and every From/To value', async () => {
    const file = await workbook([...header, [1, 2026, 3005409, 'Employee', 'A', 'HRBP', 'Team', new Date(Date.UTC(2026, 6, 1)), '31/08/2026', 'e1', 'e2', 'g1', 'g2', 'f1', 'f2', 'd1', 'd2', 'l1', 'l2']]);
    const rows = await parseStepFile(file);
    expect(rows).toHaveLength(1);
    expect(rows[0].values).toMatchObject({ pers_no: '3005409', step_from: '2026-07-01', step_to: '2026-08-31', grp: 'A', location_to: 'l2' });
    expect(rows[0].issues).toEqual([]);
  });
  it('blocks a reversed date range without dropping the row', async () => {
    const rows = await parseStepFile(await workbook([...header, [2, 2026, 3005409, '', '', '', '', '01/08/2026', '01/07/2026']]));
    expect(rows[0].issues).toContainEqual({ column: 'step_to', message: 'STEP To must not precede STEP From.' });
  });
  it('accepts dot-separated calendar dates and keeps employees absent from the namelist in the preview', async () => {
    const rows = await parseStepFile(await workbook([...header, [3, 2026, 30649914, 'Workbook Employee', 'A', '', '', '01.08.2024', '31.07.2027']]));
    expect(rows[0].values).toMatchObject({ step_from: '2024-08-01', step_to: '2027-07-31', e_name: 'Workbook Employee' });
    expect(rows[0].issues).toEqual([]);
  });
  it('reports impossible calendar dates even when written with dots', async () => {
    const rows = await parseStepFile(await workbook([...header, [4, 2026, 30649914, 'Workbook Employee', 'A', '', '', '01.07.2026', '31.06.2028']]));
    expect(rows[0].issues).toContainEqual({ column: 'step_to', message: 'Enter a real date (DD.MM.YYYY, DD/MM/YYYY, or YYYY-MM-DD).' });
  });
  it('rejects a different workbook header', async () => {
    const other = [...header[0]]; other[4] = 'Different field';
    await expect(parseStepFile(await workbook([other, header[1], [1, 2026, 3005409]]))).rejects.toBeInstanceOf(BadRequestException);
  });
});
