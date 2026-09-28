import { BadRequestException } from '@nestjs/common';
import { parseJobDescriptionsCsv } from './job-descriptions-import.parser';

function csvFile(contents: string, originalname = 'job-descriptions.csv') {
  return { originalname, buffer: Buffer.from(contents) };
}

describe('job descriptions CSV parser', () => {
  it('reads JD ID and Role Title while ignoring unrelated columns', () => {
    expect(parseJobDescriptionsCsv(csvFile([
      'JD ID,Role Title,Notes',
      ' jd-101 , Software Engineer ,ignored',
    ].join('\n')))).toEqual([{ jdId: 'JD-101', roleTitle: 'Software Engineer' }]);
  });

  it('accepts JDID and Role aliases', () => {
    expect(parseJobDescriptionsCsv(csvFile('JDID,Role\nJD-102,Designer')))
      .toEqual([{ jdId: 'JD-102', roleTitle: 'Designer' }]);
  });

  it('rejects duplicate JD IDs after normalization', () => {
    expect(() => parseJobDescriptionsCsv(csvFile('JD ID,Role Title\njd-101,Engineer\nJD-101,Manager')))
      .toThrow(BadRequestException);
  });

  it('rejects files without both required columns', () => {
    expect(() => parseJobDescriptionsCsv(csvFile('JD ID,Description\nJD-101,Engineer')))
      .toThrow(BadRequestException);
  });
});