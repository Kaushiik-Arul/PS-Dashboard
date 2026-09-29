"use client";
import type { PoolKind } from "./pool-register.types";

const options = {
  development: ["Change Wanted", "Female Talent", "Future Talent", "Key to Retain"],
  talent: ["ETP2", "ETP3", "TP1", "TP2", "TP3"],
} satisfies Record<PoolKind, string[]>;

export function PoolSelect({ kind, value, disabled, onChange }: {
  kind: PoolKind; value: string; disabled?: boolean; onChange: (value: string) => void;
}) {
  const choices = options[kind];
  const selected = choices.find(option => option.toLowerCase() === value.trim().toLowerCase()) ?? value;
  return <select value={selected} disabled={disabled} onChange={event => onChange(event.target.value)}>
    <option value="" disabled>Select a pool</option>
    {selected && !choices.includes(selected) && <option value={selected} disabled>{selected} (choose a listed pool)</option>}
    {choices.map(option => <option key={option} value={option}>{option}</option>)}
  </select>;
}
