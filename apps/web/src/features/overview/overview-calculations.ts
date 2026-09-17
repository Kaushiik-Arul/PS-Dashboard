type LabeledValue = {
  label: string;
  value: number;
};

export function shareFromData(value: string, data: readonly LabeledValue[]) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  if (total === 0) {
    return 0;
  }

  return (data.find((item) => item.label === value)?.value ?? 0) / total;
}

export function normalizeData<T extends LabeledValue>(
  data: readonly T[],
  selection: string,
  total: number,
) {
  const visibleData = selection === "All"
    ? data
    : data.filter((item) => item.label === selection);
  const visibleTotal = visibleData.reduce((sum, item) => sum + item.value, 0);

  return visibleData.map((item) => {
    const value = visibleTotal > 0
      ? Math.round((item.value / visibleTotal) * total)
      : 0;

    return {
      ...item,
      value,
      displayValue: value.toLocaleString(),
    };
  });
}

export function scaleProfile<T extends { value: number }>(
  data: readonly T[],
  total: number,
) {
  const profileTotal = data.reduce((sum, item) => sum + item.value, 0);

  if (profileTotal === 0) {
    return data.map((item) => ({ ...item, value: 0 }));
  }

  return data.map((item) => ({
    ...item,
    value: Math.round((item.value / profileTotal) * total),
  }));
}