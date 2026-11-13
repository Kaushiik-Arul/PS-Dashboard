import { hasPermission } from './permissions';

describe('dashboard customization permission', () => {
  it.each(['hrbp', 'admin'] as const)('allows %s', (role) => {
    expect(hasPermission([role], 'dashboard-customization:manage')).toBe(true);
  });

  it.each(['range_head', 'department_head', 'sub_department_head'] as const)(
    'rejects %s',
    (role) => {
      expect(hasPermission([role], 'dashboard-customization:manage')).toBe(false);
    },
  );
});

describe('attrition export permission', () => {
  it('allows HRBP users', () => {
    expect(hasPermission(['hrbp'], 'attrition:export')).toBe(true);
  });

  it.each(['admin', 'range_head', 'department_head', 'sub_department_head'] as const)(
    'rejects %s',
    (role) => {
      expect(hasPermission([role], 'attrition:export')).toBe(false);
    },
  );
});
