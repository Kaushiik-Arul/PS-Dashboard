import { BadRequestException } from '@nestjs/common';
import { namelistColumns, type NamelistRowValues, type UploadedNamelistFile } from './namelist-import.types';
import { parseNamelistFile, validateNamelistRow } from './namelist-import.parser';

function validValues(): NamelistRowValues {
  const values = Object.fromEntries(
    namelistColumns.map((column) => [column, `${column}-value`]),
  ) as NamelistRowValues;
  values.pers_no = '12345';
  values.global_id = '98765';
  values.hrbp_global_id = '45678';
  values.birth_date = '1990-05-14';
  values.joining_date = '2020-02-03';
  values.entry_for_retirement = '2050-05-31';
  values.technical_entry_date = '2020-02-03';
  values.official_email = 'employee@example.com';
  values.employee_group = 'Regular';
  values.function = 'Engineering';
  return values;
}

function csvFile(content: string): UploadedNamelistFile {
  return {
    originalname: 'namelist.csv',
    buffer: Buffer.from(content),
  };
}

function csvValue(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

describe('namelist import parser', () => {
  it('maps reordered CSV columns by normalized header name', async () => {
    const values = validValues();
    const columns = [...namelistColumns].reverse();
    const content = [
      columns.map((column) => column.replaceAll('_', ' ').toUpperCase()).join(','),
      columns.map((column) => csvValue(values[column])).join(','),
    ].join('\n');

    const rows = await parseNamelistFile(csvFile(content));

    expect(rows).toHaveLength(1);
    expect(rows[0].values).toEqual(values);
    expect(rows[0].issues).toEqual([]);
  });

  it('maps known business spreadsheet labels', async () => {
    const values = validValues();
    const businessLabels: Partial<Record<(typeof namelistColumns)[number], string>> = {
      pers_no: 'Pers.No.',
      cost_center: 'Cost Ctr',
      birth_date: 'Date of Birth',
      joining_date: 'Date of Joinin',
      hrbp_global_id: 'Global-Id of HRBP',
      hrbp2_global_id: 'Global-Id Of HRBP2',
      official_email: 'Email Official',
    };
    const content = [
      namelistColumns.map((column) => businessLabels[column] ?? column).join(','),
      namelistColumns.map((column) => csvValue(values[column])).join(','),
    ].join('\n');

    const rows = await parseNamelistFile(csvFile(content));

    expect(rows[0].values).toEqual(values);
    expect(rows[0].issues).toEqual([]);
  });

  it('allows a blank function only for outbound employees', () => {
    const outbound = validValues();
    outbound.employee_group = ' Outbound ';
    outbound.function = '';
    expect(validateNamelistRow(outbound)).toEqual([]);

    const regular = validValues();
    regular.function = '';
    expect(validateNamelistRow(regular)).toContainEqual({
      column: 'function',
      message: 'Required value is missing.',
    });
  });

  it('rejects missing headers', async () => {
    const values = validValues();
    const columns = namelistColumns.filter((column) => column !== 'official_email');
    const content = [
      columns.join(','),
      columns.map((column) => csvValue(values[column])).join(','),
    ].join('\n');

    await expect(parseNamelistFile(csvFile(content))).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});