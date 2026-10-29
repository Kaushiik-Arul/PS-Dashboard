import { classifySeparation, normalizedKey } from './attrition-classification';

describe('attrition classification', () => {
  it('normalizes whitespace and case', () => {
    expect(normalizedKey('  transfer   intra Bosch ')).toBe('TRANSFER INTRA BOSCH');
  });

  it('applies retirement, transfer, and resignation precedence', () => {
    expect(classifySeparation({ filter_value: 'Separation', reason_for_action: 'Retirement' })).toBe('Retirement');
    expect(classifySeparation({ filter_value: 'Transfer', reason_for_action: 'Resignation' })).toBe('Transfer');
    expect(classifySeparation({ filter_value: 'Exit', reason_for_action: '' })).toBe('Resignation');
    expect(classifySeparation({ filter_value: '', reason_for_action: 'Dismissal' })).toBe('Other');
  });
});