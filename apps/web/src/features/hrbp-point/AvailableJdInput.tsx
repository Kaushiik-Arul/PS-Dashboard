"use client";
import { useEffect, useRef, useState } from "react";
import { jobDescriptionsClient } from "./jd-management.http";
import type { JobDescription } from "./jd-management.types";

export function AvailableJdInput({
  value,
  disabled,
  onChange,
  onBusyChange,
}: {
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  onBusyChange?: (busy: boolean) => void;
}) {
  const [matches, setMatches] = useState<JobDescription[]>([]);
  const [message, setMessage] = useState("");
  const sequence = useRef(0);
  useEffect(
    () => () => {
      sequence.current++;
    },
    [],
  );
  const change = async (text: string) => {
    const version = ++sequence.current;
    onChange(text);
    setMatches([]);
    setMessage("");
    onBusyChange?.(false);
    if (!/^\d{3}$/.test(text.trim())) return;
    setMessage("Looking up JD suffix…");
    onBusyChange?.(true);
    try {
      const found = await jobDescriptionsClient.findBySuffix(text.trim());
      if (version !== sequence.current) return;
      if (found.length === 1) {
        onBusyChange?.(false);
        onChange(found[0].jdId);
        setMessage(found[0].roleTitle);
      } else if (found.length > 1) {
        setMatches(found);
        setMessage("Select the matching full JDID.");
      } else {
        onBusyChange?.(false);
        setMessage(
          "No matching JDID. You can enter a full ID or leave it blank.",
        );
      }
    } catch (error) {
      if (version === sequence.current) {
        onBusyChange?.(false);
        setMessage(
          error instanceof Error ? error.message : "JD lookup failed.",
        );
      }
    }
  };
  return (
    <span className="available-jd-input">
      <input
        type="text"
        value={value}
        disabled={disabled}
        maxLength={500}
        placeholder="Full JDID or last 3 digits"
        onChange={(event) => void change(event.target.value)}
      />
      {message && (
        <span className="available-jd-input__hint" role="status">
          {message}
        </span>
      )}
      {matches.length > 0 && (
        <select
          aria-label="Matching JD IDs"
          disabled={disabled}
          value=""
          onChange={(event) => {
            sequence.current++;
            onBusyChange?.(false);
            onChange(event.target.value);
            setMatches([]);
            setMessage("");
          }}
        >
          <option value="" disabled>
            Choose JDID
          </option>
          {matches.map((match) => (
            <option key={match.id} value={match.jdId}>
              {match.jdId} — {match.roleTitle}
            </option>
          ))}
        </select>
      )}
    </span>
  );
}
