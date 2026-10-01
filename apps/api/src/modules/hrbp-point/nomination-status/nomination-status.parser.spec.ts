import ExcelJS from 'exceljs';
import { parseNominationStatusFile } from './nomination-status.parser';

const headers = [
  'Year',
  'Corp/Plant',
  'Range',
  'Department',
  'E No',
  'Name',
  'TP',
  'Result',
  'Admission',
];

describe('Nomination status import', () => {
  it('parses CSV and normalizes result values', async () => {
    const rows = await parseNominationStatusFile({
      originalname: 'nomination-status.csv',
      buffer: Buffer.from(
        `${headers.join(',')}\n2026,RBAI,R1,Engineering,123,Employee,TP1,cleared,Admitted`,
      ),
    });
    expect(rows[0]).toMatchObject({
      rowNumber: 2,
      values: { employee_no: '123', result: 'Cleared' },
      issues: [],
    });
  });

  it('parses XLSX and flags unsupported results', async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Nomination status');
    sheet.addRow(headers);
    sheet.addRow([
      2026,
      'RBAI',
      'R1',
      'Engineering',
      123,
      'Employee',
      'TP1',
      'Pending',
      'Admitted',
    ]);
    const rows = await parseNominationStatusFile({
      originalname: 'nomination-status.xlsx',
      buffer: Buffer.from(await workbook.xlsx.writeBuffer()),
    });
    expect(rows[0].issues).toContainEqual({
      column: 'result',
      message: 'Enter Cleared, Amber, or Not Cleared.',
      severity: 'error',
    });
  });
});