export const separationTypes = [
  'Resignation',
  'Transfer',
  'Retirement',
  'Other',
] as const;

export type SeparationType = (typeof separationTypes)[number];

export type AttritionClassificationInput = {
  filter_value: string;
  reason_for_action: string;
};

export function normalizedKey(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toUpperCase();
}

export function classifySeparation(
  row: AttritionClassificationInput,
): SeparationType {
  const source = `${row.filter_value} ${row.reason_for_action}`.toLowerCase();
  if (/retir/.test(source)) return 'Retirement';
  if (/transfer/.test(source)) return 'Transfer';
  if (/resign|separation|exit/.test(source)) return 'Resignation';
  return 'Other';
}