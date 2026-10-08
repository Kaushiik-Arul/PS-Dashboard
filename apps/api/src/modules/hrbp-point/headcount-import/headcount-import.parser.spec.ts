import ExcelJS from 'exceljs';
import { parseHeadcountWorkbook } from './headcount-import.parser';
import type { UploadedHeadcountFile } from './headcount-import.types';

async function workbookFile(
  sheets: Array<{ name: string; rows: Array<Array<string | number>> }>,
): Promise<UploadedHeadcountFile> {
  const workbook = new ExcelJS.Workbook();
  for (const source of sheets) {
    const sheet = workbook.addWorksheet(source.name);
    source.rows.forEach((row) => sheet.addRow(row));
  }
  return {
    originalname: 'PS Namelist.xlsx',
    buffer: Buffer.from(await workbook.xlsx.writeBuffer()),
  };
}

describe('headcount workbook parser', () => {
  it('calculates monthly, range, org unit, and combined headcounts from differing layouts', async () => {
    const file = await workbookFile([
      { name: 'Instructions', rows: [['Not a namelist']] },
      {
        name: 'January 2023',
        rows: [
          ['PS Namelist'],
          [],
          ['Pers.No', 'Employee', 'Range', 'Org Unit'],
          [1001, 'A', ' BidP ', 'Engineering'],
          [1002, 'B', 'bidp', ' engineering '],
          [1003, 'C', '', 'Human   Resources'],
        ],
      },
      {
        name: 'Feb 2023',
        rows: [
          ['Personnel report'],
          ['Generated'],
          [],
          [],
          ['Organizational Unit', 'Range', 'Pers.No'],
          ['Sales', 'GanP', 2001],
        ],
      },
    ]);

    const parsed = await parseHeadcountWorkbook(file);

    expect(parsed.includedSheets).toEqual(['January 2023', 'Feb 2023']);
    expect(parsed.ignoredSheets).toEqual(['Instructions']);
    expect(parsed.issues).toEqual([]);
    expect(parsed.months).toEqual([
      {
        sheetName: 'January 2023',
        reportingMonth: '2023-01-01',
        totalHeadcount: 3,
        ranges: [{ rangeKey: 'BIDP', rangeName: 'BidP', headcount: 2 }],
        orgUnits: [
          { orgUnitKey: 'ENGINEERING', orgUnitName: 'Engineering', headcount: 2 },
          { orgUnitKey: 'HUMAN RESOURCES', orgUnitName: 'Human Resources', headcount: 1 },
        ],
        rangeOrgUnits: [{
          rangeKey: 'BIDP',
          rangeName: 'BidP',
          orgUnitKey: 'ENGINEERING',
          orgUnitName: 'Engineering',
          headcount: 2,
        }],
      },
      {
        sheetName: 'Feb 2023',
        reportingMonth: '2023-02-01',
        totalHeadcount: 1,
        ranges: [{ rangeKey: 'GANP', rangeName: 'GanP', headcount: 1 }],
        orgUnits: [{ orgUnitKey: 'SALES', orgUnitName: 'Sales', headcount: 1 }],
        rangeOrgUnits: [{
          rangeKey: 'GANP',
          rangeName: 'GanP',
          orgUnitKey: 'SALES',
          orgUnitName: 'Sales',
          headcount: 1,
        }],
      },
    ]);
  });

  it('accepts two-digit years, mixed case, and omitted spaces in sheet names', async () => {
    const file = await workbookFile([
      { name: 'Feb 23', rows: [['Pers.No', 'Range', 'Organisational Unit'], [1001, 'G1', 'OU1']] },
      { name: 'march 23', rows: [['Pers.No', 'Range', 'Org Unit'], [1002, 'G1', 'OU1']] },
      { name: 'July23', rows: [['Pers.No', 'Range', 'Org Unit'], [1003, 'G2', 'OU2']] },
      { name: 'Aug 26', rows: [['Pers.No', 'Range', 'Org Unit'], [1004, 'G3', 'OU3']] },
    ]);

    const parsed = await parseHeadcountWorkbook(file);

    expect(parsed.issues).toEqual([]);
    expect(parsed.ignoredSheets).toEqual([]);
    expect(parsed.months.map((month) => month.reportingMonth)).toEqual([
      '2023-02-01',
      '2023-03-01',
      '2023-07-01',
      '2026-08-01',
    ]);
  });

  it('recognizes every abbreviated sheet name in the historical workbook', async () => {
    const sheetNames = [
      'Feb 23', 'march 23', 'April 23', 'May 23', 'June 23', 'July23',
      'Aug 23', 'Sept 23', 'Oct 23', 'Nov 23', 'Dec 23', 'Jan 24',
      'Feb 24', 'Mar 24', 'Apr 24', 'May 24', 'June 24', 'July 24',
      'Aug 24', 'Sept 24', 'Oct 24', 'Nov 24', 'Dec 24', 'Jan 25',
      'Feb 25', 'Mar 25', 'Apr 25', 'May 25', 'June 25', 'Jul 25',
      'Aug 25', 'Sept 25', 'Oct 25', 'Nov 25', 'Dec 25', 'Jan 26',
      'Feb 26', 'Mar 26', 'Apr 26', 'May 26', 'June 26', 'July 26',
      'Aug 26',
    ];
    const file = await workbookFile(sheetNames.map((name, index) => ({
      name,
      rows: [['Pers.No', 'Range', 'Org Unit'], [index + 1, 'G1', 'OU1']],
    })));

    const parsed = await parseHeadcountWorkbook(file);

    expect(parsed.includedSheets).toEqual(sheetNames);
    expect(parsed.ignoredSheets).toEqual([]);
    expect(parsed.issues).toEqual([]);
    expect(parsed.months).toHaveLength(sheetNames.length);
  });

  it('reports duplicate employees and duplicate normalized months', async () => {
    const file = await workbookFile([
      {
        name: 'August 2026',
        rows: [
          ['Pers.No', 'Range', 'Org Unit'],
          [1001, 'G1', 'OU1'],
          [1001, 'G2', 'OU2'],
        ],
      },
      {
        name: 'Aug 2026',
        rows: [
          ['Pers.No', 'Range', 'Org Unit'],
          [2001, 'G1', 'OU1'],
        ],
      },
    ]);

    const parsed = await parseHeadcountWorkbook(file);

    expect(parsed.months).toHaveLength(1);
    expect(parsed.months[0].totalHeadcount).toBe(1);
    expect(parsed.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ sheetName: 'August 2026', rowNumber: 3, column: 'pers_no' }),
      expect.objectContaining({ sheetName: 'Aug 2026', message: expect.stringContaining('same month') }),
    ]));
  });

  it('rejects a month sheet whose required headers cannot be detected', async () => {
    const file = await workbookFile([
      { name: 'March 2024', rows: [['Employee ID', 'Grade'], [1001, 'G1']] },
    ]);

    const parsed = await parseHeadcountWorkbook(file);

    expect(parsed.months).toEqual([]);
    expect(parsed.issues).toEqual([
      expect.objectContaining({ sheetName: 'March 2024', message: expect.stringContaining('first 20 rows') }),
    ]);
  });
});