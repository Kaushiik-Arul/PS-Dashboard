"use client";

export interface MultiSelectFilterProps {
  id: string;
  label: string;
  options: string[];
  value: string[];
  onChange: (value: string[]) => void;
  isOpen: boolean;
  onToggle: () => void;
  onClose?: () => void;
  formatOption?: (value: string) => string;
}

export function areAllOptionsSelected(value: string[], options: string[]) {
  return options.length > 0 && options.every((option) => value.includes(option));
}

export function reconcileMultiSelectSelection(
  selected: string[],
  previousOptions: string[],
  nextOptions: string[],
  selectionWasAll = areAllOptionsSelected(selected, previousOptions),
) {
  if (selectionWasAll) return [...nextOptions];
  return selected.length > 0 ? [...selected] : [...nextOptions];
}

export type MultiSelectSelectionIntent<TKey extends string> = Partial<Record<TKey, boolean>>;

export function reconcileMultiSelectSelections<TKey extends string>(
  selections: Record<TKey, string[]>,
  previousOptions: Partial<Record<TKey, string[]>>,
  nextOptions: Partial<Record<TKey, string[]>>,
  changedKey: TKey,
  selectionIntent: MultiSelectSelectionIntent<TKey>,
) {
  const reconciled = { ...selections };
  (Object.keys(nextOptions) as TKey[]).forEach((key) => {
    const previous = previousOptions[key] ?? [];
    const next = nextOptions[key] ?? [];
    const selectionWasAll = key === changedKey
      ? areAllOptionsSelected(selections[key], previous)
      : selectionIntent[key] ?? areAllOptionsSelected(selections[key], previous);
    selectionIntent[key] = selectionWasAll;
    if (key !== changedKey) {
      reconciled[key] = reconcileMultiSelectSelection(
        selections[key],
        previous,
        next,
        selectionWasAll,
      );
    }
  });
  return reconciled;
}

export function MultiSelectFilter({
  id,
  label,
  options,
  value,
  onChange,
  isOpen,
  onToggle,
  onClose,
  formatOption = (option) => option,
}: MultiSelectFilterProps) {
  const visibleOptions = [...options, ...value.filter((item) => !options.includes(item))];
  const allSelected = areAllOptionsSelected(value, visibleOptions);
  const partiallySelected = value.length > 0 && !allSelected;
  const summary = allSelected
    ? "All"
    : value.length === 0
      ? "None selected"
      : value.length === 1
        ? formatOption(value[0])
        : `${value.length} selected`;

  return (
    <div className="overview-filters__field multi-select-filter">
      <span className="multi-select-filter__label" id={`${id}-label`}>{label}</span>
      <div className={`multi-select-filter__control${isOpen ? " is-open" : ""}`} onKeyDown={(event) => {
        if (event.key === "Escape" && isOpen) {
          event.preventDefault();
          onClose?.();
        }
      }}>
        <button
          className="multi-select-filter__trigger"
          type="button"
          aria-expanded={isOpen}
          aria-controls={`${id}-options`}
          aria-labelledby={`${id}-label ${id}-summary`}
          onClick={onToggle}
        >
          <span id={`${id}-summary`}>{summary}</span>
          <i className="a-icon boschicon-bosch-ic-down" aria-hidden="true" />
        </button>
        {isOpen && <div className="multi-select-filter__options" id={`${id}-options`} role="group" aria-labelledby={`${id}-label`}>
          <label><input
            type="checkbox"
            checked={allSelected}
            ref={(node) => { if (node) node.indeterminate = partiallySelected; }}
            onChange={(event) => onChange(event.target.checked ? visibleOptions : [])}
          /><span>All</span></label>
          {visibleOptions.map((option) => <label key={option}>
            <input
              type="checkbox"
              checked={value.includes(option)}
              onChange={() => onChange(value.includes(option)
                ? value.filter((item) => item !== option)
                : [...value, option])}
            />
            <span>{formatOption(option)}</span>
          </label>)}
        </div>}
      </div>
    </div>
  );
}