import ExcelJS from 'exceljs';
import { parseMrmPul } from './mrm-pul.parser';

async function workbookBuffer(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.addWorksheet('Instructions');
  const sheet = workbook.addWorksheet('Summary');
  sheet.addRow(['PSIN', 'YTD\n09.26', 'YTD\n10.26', 'YTD\n11.26']);
  sheet.addRow(['PSIN PC', 7203, 7250, null]);
  sheet.addRow(['PSIN Corp', 570, { formula: 'B3+1', result: 571.2 }, '-']);
  const consolidation = workbook.addWorksheet('Consolidation');
  consolidation.addRow(['INPS Personnel Capacity (state)', 'YTD 09.26', 'YTD 10.26', 'YTD 11.26']);
  consolidation.addRow(['Direct', 5855, 5900, null]);
  consolidation.addRow(['Direct M&SS', 243, 243, null]);
  consolidation.addRow(['Indirect', 1348, 1350, null]);
  consolidation.addRow(['Indirect M&SS', 1220, 1227, null]);
  consolidation.addRow(['Permanent', 2267, 2267, null]);
  consolidation.addRow(['Temporary', 3345, 3390, null]);
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

describe('parseMrmPul', () => {
  it('reads PS Corp and PS-IN values for the data month and the month before', async () => {
    const result = await parseMrmPul(await workbookBuffer(), '2026-10');
    expect(result.corp).toMatchObject({ value: '571', header: 'YTD 10.26', row: 3, previousValue: '570', previousHeader: 'YTD 09.26' });
    expect(result.in).toMatchObject({ value: '1350', header: 'YTD 10.26',     row: 4, previousValue: '1348' });
        expect(result.indirectMss).toMatchObject({ value: '1227', previousValue: '1220', row: 5 });
    expect(result.directMss).toMatchObject({ value: '243', row: 3 });
    expect(result.pcdDirectHc).toMatchObject({ value: '5900', previousValue: '5855', row: 2 });
    expect(result.permanent).toMatchObject({ value: '2267', row: 6 });
    expect(result.temporary).toMatchObject({ value: '3390', previousValue: '3345', row: 7 });
    expect((await parseMrmPul(await workbookBuffer(), '2026-09')).corp?.previousValue).toBeNull();
  });

  it('rejects months without a value', async () => {
    await expect(parseMrmPul(await workbookBuffer(), '2026-11')).rejects.toThrow('No value');
    await expect(parseMrmPul(await workbookBuffer(), '2026-12')).rejects.toThrow('not found');
  });
});
