import { BadRequestException } from '@nestjs/common';
import ExcelJS from 'exceljs';
import { parseEmployeeJdFile, validateEmployeeJdRow } from './employee-jd-import.parser';

async function workbookFile(headers: string[], rows: Array<Array<string | number>>) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Assignments');
  sheet.addRow(headers);
  rows.forEach((row) => sheet.addRow(row));
  const buffer = await workbook.xlsx.writeBuffer();
  return { originalname: 'employee-jd.xlsx', buffer: Buffer.from(buffer) };
}

describe('employee JD import parser', () => {
  it('reads Pers.No. and JDID while ignoring unrelated columns', async () => {
    const file = await workbookFile(
      ['Pers.No.', 'Personnel Number', 'Employee Group', 'JDID'],
      [[11971004, 'Krishnamurthy Kumar', 'Active', 'jd-101']],
    );

    await expect(parseEmployeeJdFile(file)).resolves.toEqual([{
      rowNumber: 2,
      values: { pers_no: '11971004', jd_id: 'JD-101' },
      issues: [],
    }]);
  });

  it('rejects duplicate logical JD columns', async () => {
    const file = await workbookFile(['Pers.No.', 'JDID', 'JD ID'], [[11971004, 'JD-101', 'JD-101']]);

    await expect(parseEmployeeJdFile(file)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('validates required values and employee number bounds', () => {
    expect(validateEmployeeJdRow({ pers_no: '0', jd_id: '' })).toEqual([
      { column: 'pers_no', message: 'Enter a valid positive employee number.' },
      { column: 'jd_id', message: 'No JD ID: this employee will be saved without a JD assignment.', severity: 'warning' },
    ]);
  });

  it('keeps a row with an empty JD ID for import', async () => {
    const file = await workbookFile(['Pers.No.', 'JDID'], [[11971004, '']]);
    await expect(parseEmployeeJdFile(file)).resolves.toEqual([{
      rowNumber: 2,
      values: { pers_no: '11971004', jd_id: '' },
      issues: [{ column: 'jd_id', message: 'No JD ID: this employee will be saved without a JD assignment.', severity: 'warning' }],
    }]);
  });
});
