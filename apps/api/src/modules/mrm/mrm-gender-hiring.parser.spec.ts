import ExcelJS from 'exceljs';
import { parseMrmGenderHiring } from './mrm-gender-hiring.parser';

describe('parseMrmGenderHiring', () => {
  it('counts female joiners of the data month, with PS Corp excluding plant ranges', async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Hiring');
    sheet.addRow(['Sl. No.', 'Actual Date of Joining', 'Gender', 'Specific Org unit']);
    sheet.addRow([1, new Date(Date.UTC(2026, 8, 3)), 'Female', 'PS/CIN-CV-ROW']);
    sheet.addRow([2, '9/14/2026', 'Female', 'BidP1/MOE21']);
    sheet.addRow([3, '9/20/26', 'Male', 'PS/LOG']);
    sheet.addRow([4, new Date(Date.UTC(2026, 8, 9)), 'Female', 'Unknown Unit']);
    sheet.addRow([5, new Date(Date.UTC(2026, 7, 9)), 'Female', 'PS/CIN-CV-ROW']);
    sheet.addRow([6, new Date(Date.UTC(2026, 9, 1)), 'Female', 'PS/CIN-CV-ROW']);
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    const ranges = new Map([['ps/cin-cv-row', 'PS/CIN-IN'], ['bidp1/moe21', 'BidP'], ['ps/log', 'PS/LOG-IN']]);

    const result = await parseMrmGenderHiring(buffer, '2026-09', ranges);

    expect(result.latest).toMatchObject({ month: '2026-09', inCount: 3, corpCount: 1 });
    expect(result.previous).toMatchObject({ month: '2026-08', inCount: 1, corpCount: 1 });
    expect(result.latest.rows.map((row) => row.row)).toEqual([2, 3, 5]);
    expect(result.unmappedOrgUnits).toEqual(['Unknown Unit']);
  });

  it('lists all-gender joiners from January to the latest month with their lead time', async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Hiring');
    sheet.addRow(['Actual Date of Joining', 'Gender', 'Specific Org unit', 'Lead Time to Offer']);
    sheet.addRow([new Date(Date.UTC(2026, 0, 5)), 'Male', 'PS/LOG', 30]);
    sheet.addRow([new Date(Date.UTC(2026, 8, 5)), 'Female', 'BidP1/MOE21', 50]);
    sheet.addRow([new Date(Date.UTC(2026, 9, 5)), 'Male', 'PS/LOG', null]);
    sheet.addRow([new Date(Date.UTC(2025, 11, 31)), 'Male', 'PS/LOG', 99]);
    sheet.addRow([new Date(Date.UTC(2026, 10, 1)), 'Male', 'PS/LOG', 99]);
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    const ranges = new Map([['ps/log', 'PS/LOG-IN'], ['bidp1/moe21', 'BidP']]);

    const result = await parseMrmGenderHiring(buffer, '2026-10', ranges);

    expect(result.leadTimeRows.map((item) => [item.row, item.leadTime, item.inCorp, item.leadTimeMissing])).toEqual([
      [2, 30, true, false],
      [3, 50, false, false],
      [4, 0, true, true],
    ]);
    expect(result.hireRows.map((item) => [item.row, item.gender])).toEqual([[2, 'M'], [3, 'F'], [4, 'M']]);
  });
});


