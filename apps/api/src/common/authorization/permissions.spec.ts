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
