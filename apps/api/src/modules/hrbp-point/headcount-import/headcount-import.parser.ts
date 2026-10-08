import { BadRequestException } from '@nestjs/common';
import JSZip from 'jszip';
import { StringDecoder } from 'node:string_decoder';
import { SaxesParser, type SaxesTagPlain } from 'saxes';
import type {
  HeadcountImportIssue,
  HeadcountMonthCalculation,
  HeadcountOrgUnitCount,
  HeadcountRangeCount,
  HeadcountRangeOrgUnitCount,
  ParsedHeadcountWorkbook,
  UploadedHeadcountFile,
} from './headcount-import.types';

const months = new Map<string, number>([
  ['january', 1], ['jan', 1],
  ['february', 2], ['feb', 2],
  ['march', 3], ['mar', 3],
  ['april', 4], ['apr', 4],
  ['may', 5],
  ['june', 6], ['jun', 6],
  ['july', 7], ['jul', 7],
  ['august', 8], ['aug', 8],
  ['september', 9], ['sept', 9], ['sep', 9],
  ['october', 10], ['oct', 10],
  ['november', 11], ['nov', 11],
  ['december', 12], ['dec', 12],
]);

function parseXmlTags(xml: string, onTag: (tag: SaxesTagPlain) => void): void {
  const parser = new SaxesParser({ xmlns: false });
  parser.on('opentag', onTag);
  parser.write(xml).close();
}

type WorksheetSource = {
  name: string;
  path: string;
};

async function openWorkbook(buffer: Buffer): Promise<{
  archive: JSZip;
  worksheets: WorksheetSource[];
}> {
  const archive = await JSZip.loadAsync(buffer);
  const workbookEntry = archive.file('xl/workbook.xml');
  const relationshipsEntry = archive.file('xl/_rels/workbook.xml.rels');
  if (!workbookEntry || !relationshipsEntry) {
    throw new BadRequestException('The workbook metadata is incomplete.');
  }
  const [workbookXml, relationshipsXml] = await Promise.all([
    workbookEntry.async('string'),
    relationshipsEntry.async('string'),
  ]);

  const pathByRelationship = new Map<string, string>();
  parseXmlTags(relationshipsXml, (tag) => {
    if (!tag.name.endsWith('Relationship')) return;
    const relationshipId = tag.attributes.Id;
    const target = tag.attributes.Target?.replaceAll('\\', '/');
    if (!relationshipId || !target || !/(?:^|\/)worksheets\/sheet\d+\.xml$/i.test(target)) return;
    const path = target.startsWith('/xl/')
      ? target.slice(1)
      : `xl/${target.replace(/^\/+/, '')}`;
    pathByRelationship.set(relationshipId, path);
  });

  const worksheets: WorksheetSource[] = [];
  parseXmlTags(workbookXml, (tag) => {
    if (!tag.name.endsWith('sheet')) return;
    const name = tag.attributes.name;
    const relationshipId = tag.attributes['r:id'];
    const path = relationshipId ? pathByRelationship.get(relationshipId) : undefined;
    if (name && path) worksheets.push({ name, path });
  });
  if (!worksheets.length) {
    throw new BadRequestException('The workbook does not contain readable worksheet metadata.');
  }
  return { archive, worksheets };
}

function localName(name: string): string {
  return name.includes(':') ? name.slice(name.lastIndexOf(':') + 1) : name;
}

async function parseZipXml(
  entry: JSZip.JSZipObject,
  parser: Pick<SaxesParser, 'write' | 'close'>,
): Promise<void> {
  const decoder = new StringDecoder('utf8');
  const stream = entry.nodeStream('nodebuffer');
  await new Promise<void>((resolve, reject) => {
    let finished = false;
    const fail = (error: unknown) => {
      if (finished) return;
      finished = true;
      reject(error);
    };
    stream.on('data', (chunk: Buffer | string) => {
      if (finished) return;
      try {
        parser.write(decoder.write(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
      } catch (error) {
        fail(error);
      }
    });
    stream.once('error', fail);
    stream.once('end', () => {
      if (finished) return;
      try {
        parser.write(decoder.end()).close();
        finished = true;
        resolve();
      } catch (error) {
        fail(error);
      }
    });
  });
}

async function readSharedStrings(archive: JSZip): Promise<string[]> {
  const entry = archive.file('xl/sharedStrings.xml');
  if (!entry) return [];
  const values: string[] = [];
  let insideItem = false;
  let insideText = false;
  let value = '';
  const parser = new SaxesParser({ xmlns: false });
  parser.on('opentag', (tag) => {
    const name = localName(tag.name);
    if (name === 'si') {
      insideItem = true;
      value = '';
    } else if (insideItem && name === 't') {
      insideText = true;
    }
  });
  parser.on('text', (text) => {
    if (insideItem && insideText) value += text;
  });
  parser.on('closetag', (tag) => {
    const name = localName(tag.name);
    if (name === 't') insideText = false;
    else if (name === 'si') {
      values.push(value);
      insideItem = false;
    }
  });
  await parseZipXml(entry, parser);
  return values;
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function reportingMonth(sheetName: string): string | null {
  const match = sheetName.trim().replace(/\s+/g, ' ').match(/^([a-z]+)\s*(\d{2}|\d{4})$/i);
  if (!match) return null;
  const month = months.get(match[1].toLowerCase());
  const yearPart = Number(match[2]);
  const year = match[2].length === 2 ? 2000 + yearPart : yearPart;
  if (!month || year < 2000 || year > 9999) return null;
  return `${year}-${String(month).padStart(2, '0')}-01`;
}

function cleanRangeName(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function rangeKey(value: string): string {
  return cleanRangeName(value).toUpperCase();
}

function cleanOrgUnitName(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function orgUnitKey(value: string): string {
  return cleanOrgUnitName(value).toUpperCase();
}

async function calculateMonth(
  entry: JSZip.JSZipObject,
  sheetName: string,
  month: string,
  issues: HeadcountImportIssue[],
  sharedStrings: readonly string[],
): Promise<HeadcountMonthCalculation | null> {
  let header: {
    rowNumber: number;
    persNoColumn: number;
    rangeColumn: number;
    orgUnitColumn: number;
  } | null = null;
  let invalidHeader = false;
  const employees = new Map<string, number>();
  const rangeCounts = new Map<string, HeadcountRangeCount>();
  const orgUnitCounts = new Map<string, HeadcountOrgUnitCount>();
  const rangeOrgUnitCounts = new Map<string, HeadcountRangeOrgUnitCount>();
  let rowNumber = 0;
  let nextRowNumber = 1;
  let rowValues = new Map<number, string>();

  const processRow = () => {
    if (!header) {
      if (rowNumber > 20 || invalidHeader) return;
      const matches = new Map<string, number[]>();
      for (const [column, value] of rowValues) {
        const headerName = normalizeHeader(value);
        const normalized = headerName === 'organizational_unit' || headerName === 'organisational_unit'
          ? 'org_unit'
          : headerName;
        if (normalized !== 'pers_no' && normalized !== 'range' && normalized !== 'org_unit') continue;
        matches.set(normalized, [...(matches.get(normalized) ?? []), column]);
      }
      const persNoColumns = matches.get('pers_no') ?? [];
      const rangeColumns = matches.get('range') ?? [];
      const orgUnitColumns = matches.get('org_unit') ?? [];
      if (persNoColumns.length === 1 && rangeColumns.length === 1 && orgUnitColumns.length === 1) {
        header = {
          rowNumber,
          persNoColumn: persNoColumns[0],
          rangeColumn: rangeColumns[0],
          orgUnitColumn: orgUnitColumns[0],
        };
        return;
      }
      if (persNoColumns.length > 1 || rangeColumns.length > 1 || orgUnitColumns.length > 1) {
        issues.push({
          sheetName,
          rowNumber,
          message: 'The header row contains duplicate Pers.No, Range, or Org Unit columns.',
        });
        invalidHeader = true;
      }
      return;
    }

    const rawPersNo = (rowValues.get(header.persNoColumn) ?? '').trim();
    const employeeRange = cleanRangeName(rowValues.get(header.rangeColumn) ?? '');
    const employeeOrgUnit = cleanOrgUnitName(rowValues.get(header.orgUnitColumn) ?? '');
    if (!rawPersNo && !employeeRange && !employeeOrgUnit) return;
    if (!rawPersNo) {
      issues.push({
        sheetName,
        rowNumber,
        column: 'pers_no',
        message: 'Pers.No is required when the row contains a Range or Org Unit.',
      });
      return;
    }
    if (!/^[1-9]\d*$/.test(rawPersNo)) {
      issues.push({
        sheetName,
        rowNumber,
        column: 'pers_no',
        message: 'Pers.No must be a positive whole number.',
      });
      return;
    }

    const employeeKey = BigInt(rawPersNo).toString();
    const existing = employees.get(employeeKey);
    if (existing !== undefined) {
      issues.push({
        sheetName,
        rowNumber,
        column: 'pers_no',
        message: `Pers.No is duplicated; the first occurrence is on row ${existing}.`,
      });
      return;
    }
    employees.set(employeeKey, rowNumber);
    if (employeeRange) {
      const key = rangeKey(employeeRange);
      const count = rangeCounts.get(key);
      if (count) count.headcount += 1;
      else rangeCounts.set(key, { rangeKey: key, rangeName: employeeRange, headcount: 1 });
    }
    if (employeeOrgUnit) {
      const key = orgUnitKey(employeeOrgUnit);
      const count = orgUnitCounts.get(key);
      if (count) count.headcount += 1;
      else orgUnitCounts.set(key, {
        orgUnitKey: key,
        orgUnitName: employeeOrgUnit,
        headcount: 1,
      });
    }
    if (employeeRange && employeeOrgUnit) {
      const normalizedRange = rangeKey(employeeRange);
      const normalizedOrgUnit = orgUnitKey(employeeOrgUnit);
      const key = `${normalizedRange}\u0000${normalizedOrgUnit}`;
      const count = rangeOrgUnitCounts.get(key);
      if (count) count.headcount += 1;
      else rangeOrgUnitCounts.set(key, {
        rangeKey: normalizedRange,
        rangeName: employeeRange,
        orgUnitKey: normalizedOrgUnit,
        orgUnitName: employeeOrgUnit,
        headcount: 1,
      });
    }
  };

  let cellColumn = 0;
  let cellType = '';
  let cellValue = '';
  let inlineText = '';
  let insideValue = false;
  let insideInlineText = false;
  const parser = new SaxesParser({ xmlns: false });
  parser.on('opentag', (tag) => {
    const name = localName(tag.name);
    if (name === 'row') {
      rowNumber = Number(tag.attributes.r) || nextRowNumber;
      nextRowNumber = rowNumber + 1;
      rowValues = new Map();
    } else if (name === 'c') {
      const reference = tag.attributes.r ?? '';
      const letters = reference.match(/^([A-Z]+)/i)?.[1].toUpperCase() ?? '';
      cellColumn = [...letters].reduce((column, letter) => column * 26 + letter.charCodeAt(0) - 64, 0);
      cellType = tag.attributes.t ?? '';
      cellValue = '';
      inlineText = '';
    } else if (name === 'v') {
      insideValue = true;
    } else if (name === 't' && cellType === 'inlineStr') {
      insideInlineText = true;
    }
  });
  parser.on('text', (text) => {
    if (insideValue) cellValue += text;
    else if (insideInlineText) inlineText += text;
  });
  parser.on('closetag', (tag) => {
    const name = localName(tag.name);
    if (name === 'v') insideValue = false;
    else if (name === 't') insideInlineText = false;
    else if (name === 'c' && cellColumn > 0) {
      const value = cellType === 's'
        ? sharedStrings[Number(cellValue)] ?? ''
        : cellType === 'inlineStr'
          ? inlineText
          : cellType === 'e'
            ? ''
            : cellValue;
      rowValues.set(cellColumn, value);
    } else if (name === 'row') {
      processRow();
    }
  });
  await parseZipXml(entry, parser);

  if (!header && !invalidHeader) {
    issues.push({
      sheetName,
      message: 'Could not find one Pers.No, one Range, and one Org Unit column within the first 20 rows.',
    });
    return null;
  }
  if (!header) return null;

  if (!employees.size) {
    issues.push({ sheetName, message: 'The sheet does not contain any valid employee rows.' });
  }

  return {
    sheetName,
    reportingMonth: month,
    totalHeadcount: employees.size,
    ranges: [...rangeCounts.values()].sort((left, right) => left.rangeName.localeCompare(right.rangeName)),
    orgUnits: [...orgUnitCounts.values()].sort((left, right) => left.orgUnitName.localeCompare(right.orgUnitName)),
    rangeOrgUnits: [...rangeOrgUnitCounts.values()].sort((left, right) =>
      left.rangeName.localeCompare(right.rangeName)
      || left.orgUnitName.localeCompare(right.orgUnitName)),
  };
}

export async function parseHeadcountWorkbook(file: UploadedHeadcountFile): Promise<ParsedHeadcountWorkbook> {
  if (!file.originalname.toLowerCase().endsWith('.xlsx')) {
    throw new BadRequestException('Only XLSX workbooks are supported.');
  }

  const { archive, worksheets } = await openWorkbook(file.buffer);
  const sharedStrings = await readSharedStrings(archive);

  const includedSheets: string[] = [];
  const ignoredSheets: string[] = [];
  const issues: HeadcountImportIssue[] = [];
  const calculatedMonths: HeadcountMonthCalculation[] = [];
  const sheetByMonth = new Map<string, string>();

  for (const worksheet of worksheets) {
    const month = reportingMonth(worksheet.name);
    if (!month) {
      ignoredSheets.push(worksheet.name);
      continue;
    }
    includedSheets.push(worksheet.name);
    const existingSheet = sheetByMonth.get(month);
    if (existingSheet) {
      issues.push({
        sheetName: worksheet.name,
        message: `This sheet resolves to the same month as ${existingSheet}.`,
      });
      continue;
    }
    sheetByMonth.set(month, worksheet.name);
    const entry = archive.file(worksheet.path);
    if (!entry) {
      issues.push({ sheetName: worksheet.name, message: 'The worksheet data is missing from the workbook.' });
      continue;
    }
    const calculation = await calculateMonth(entry, worksheet.name, month, issues, sharedStrings);
    if (calculation) calculatedMonths.push(calculation);
  }

  if (!includedSheets.length) {
    throw new BadRequestException('The workbook does not contain any worksheets named Month YYYY.');
  }

  return {
    includedSheets,
    ignoredSheets,
    months: calculatedMonths.sort((left, right) => left.reportingMonth.localeCompare(right.reportingMonth)),
    issues,
  };
}