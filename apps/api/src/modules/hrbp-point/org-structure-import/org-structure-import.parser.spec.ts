import { BadRequestException } from '@nestjs/common';
import ExcelJS from 'exceljs';
import { parseOrgStructureFile } from './org-structure-import.parser';

const header = ['Role Title', 'Reporting To', 'JD ID', 'Career Level', 'Layer', 'Order By', 'Is Active'];

async function workbook(rows: unknown[][]) {
  const book = new ExcelJS.Workbook();
  const sheet = book.addWorksheet('Org Structure');
  rows.forEach((row) => sheet.addRow(row));
  return { originalname: 'org-structure.xlsx', buffer: Buffer.from(await book.xlsx.writeBuffer()) };
}

describe('Org structure Excel parser', () => {
  it('maps all columns and preserves blank values', async () => {
    const rows = await parseOrgStructureFile(await workbook([
      header,
      ['Regional Business Unit CV', '', 'PSGMMAM398', 'Management', 'L1', 1, 'Yes'],
    ]));

    expect(rows).toEqual([{
      rowNumber: 2,
      values: {
        role_title: 'Regional Business Unit CV',
        reporting_to: '',
        jd_id: 'PSGMMAM398',
        career_level: 'Management',
        layer: 'L1',
        order_by: '1',
        is_active: 'Yes',
        grade: '',
        function: '',
      },
    }]);
  });

  it('maps optional Grade and Function columns when present', async () => {
    const rows = await parseOrgStructureFile(await workbook([
      [...header, 'Function', 'Grade'],
      ['Commercial Director', '', 'JD-42', 'Management', 'L1', 1, 'Yes', 'Sales', 'G12'],
    ]));

    expect(rows[0].values.grade).toBe('G12');
    expect(rows[0].values.function).toBe('Sales');
  });

  it('keeps duplicate titles and unmatched parents without business validation', async () => {
    const rows = await parseOrgStructureFile(await workbook([
      header,
      ['Repeated Role', 'Missing Parent', '', '', 'L2', 2, 'Yes'],
      ['Repeated Role', 'Missing Parent', '', '', 'L2', 1, 'No'],
    ]));

    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.values.role_title)).toEqual(['Repeated Role', 'Repeated Role']);
  });

  it('rejects a workbook with different headers', async () => {
    await expect(parseOrgStructureFile(await workbook([
      ['Role', ...header.slice(1)],
      ['A role'],
    ]))).rejects.toBeInstanceOf(BadRequestException);
  });
});