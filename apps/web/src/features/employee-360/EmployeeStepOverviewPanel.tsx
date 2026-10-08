"use client";

import { useState, type FormEvent } from "react";
import type { EmployeeStepOverview } from "./employee-360.types";
import { formatEmployeeDate } from "./employee-date";
import { updateStepAvailability } from "./step-availability.http";

function valueOrBlank(value: string | null): string {
  return value?.trim() || "";
}

function AvailabilityChoice({
  label,
  checked,
}: {
  label: string;
  checked: boolean;
}) {
  return (
    <label className="employee-step-overview__choice">
      <input type="checkbox" checked={checked} disabled />
      <span>{label}</span>
    </label>
  );
}

export function EmployeeStepOverviewPanel({
  persNo,
  overview,
  canEdit,
}: {
  persNo: string;
  overview?: EmployeeStepOverview;
  canEdit: boolean;
}) {
  const active = overview?.active ?? null;
  const initialAvailability = overview?.availability ?? {
    available: false,
    preferences: null,
    comments: null,
  };
  const [availability, setAvailability] = useState(initialAvailability);
  const [editing, setEditing] = useState(false);
  const [draftAvailable, setDraftAvailable] = useState(initialAvailability.available);
  const [draftPreferences, setDraftPreferences] = useState(initialAvailability.preferences ?? "");
  const [draftComments, setDraftComments] = useState(initialAvailability.comments ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const openEditor = () => {
    setDraftAvailable(availability.available);
    setDraftPreferences(availability.preferences ?? "");
    setDraftComments(availability.comments ?? "");
    setMessage("");
    setEditing(true);
  };

  const saveAvailability = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const updated = await updateStepAvailability(persNo, {
        available: draftAvailable,
        preferences: draftAvailable ? draftPreferences : null,
        comments: draftAvailable ? draftComments : null,
      });
      setAvailability(updated);
      setEditing(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "STEP availability could not be updated.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="employee-profile__panel employee-profile__panel--step">
      <header>
        <i className="a-icon boschicon-bosch-ic-hierarchy" aria-hidden="true" />
        <h2>STEP overview</h2>
      </header>

      <table className="employee-step-overview__table">
        <thead>
          <tr>
            <th scope="col">STEP</th>
            <th scope="col">Portfolio</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">Active</th>
            <td>
              {active ? (
                <dl className="employee-step-overview__details">
                  <div><dt>Year</dt><dd>{active.year}</dd></div>
                  <div><dt>Exchanged with</dt><dd>{valueOrBlank(active.exchangedWith)}</dd></div>
                  <div><dt>From department</dt><dd>{valueOrBlank(active.departmentFrom)}</dd></div>
                  <div><dt>To department</dt><dd>{valueOrBlank(active.departmentTo)}</dd></div>
                  <div><dt>STEP period from</dt><dd>{formatEmployeeDate(active.stepPeriodFrom)}</dd></div>
                  <div><dt>STEP period to</dt><dd>{formatEmployeeDate(active.stepPeriodTo)}</dd></div>
                </dl>
              ) : (
                <p className="employee-step-overview__empty">No Active STEP record.</p>
              )}
            </td>
          </tr>
          <tr>
            <th scope="row">
              <div className="employee-step-overview__availability-heading">
                <span>Availability</span>
                {canEdit && !editing && (
                  <button className="a-button a-button--integrated -small" type="button" title="Edit availability" aria-label="Edit STEP availability" onClick={openEditor}>
                    <i className="a-icon a-button__icon boschicon-bosch-ic-edit" aria-hidden="true" />
                  </button>
                )}
              </div>
            </th>
            <td>
              {editing ? (
                <form className="employee-step-overview__editor" onSubmit={saveAvailability}>
                  <fieldset disabled={saving}>
                    <legend>Availability</legend>
                    <div className="employee-step-overview__choices">
                      <label className="employee-step-overview__choice">
                        <input type="radio" name={`step-availability-${persNo}`} checked={draftAvailable} onChange={() => setDraftAvailable(true)} />
                        <span>Yes</span>
                      </label>
                      <label className="employee-step-overview__choice">
                        <input type="radio" name={`step-availability-${persNo}`} checked={!draftAvailable} onChange={() => setDraftAvailable(false)} />
                        <span>No</span>
                      </label>
                    </div>
                    <label>
                      <span>Preferences</span>
                      <textarea rows={2} maxLength={4000} disabled={!draftAvailable || saving} value={draftPreferences} onChange={(event) => setDraftPreferences(event.target.value)} />
                    </label>
                    <label>
                      <span>Comments</span>
                      <textarea rows={3} maxLength={4000} disabled={!draftAvailable || saving} value={draftComments} onChange={(event) => setDraftComments(event.target.value)} />
                    </label>
                  </fieldset>
                  {message && <p className="employee-step-overview__error" role="alert">{message}</p>}
                  <div className="employee-step-overview__editor-actions">
                    <button className="a-button a-button--secondary -small" type="button" disabled={saving} onClick={() => setEditing(false)}><span className="a-button__label">Cancel</span></button>
                    <button className="a-button a-button--primary -small" type="submit" disabled={saving}><span className="a-button__label">{saving ? "Saving..." : "Save"}</span></button>
                  </div>
                </form>
              ) : (
                <div>
                  <div className="employee-step-overview__choices" aria-label="STEP availability">
                    <AvailabilityChoice label="Yes" checked={availability.available} />
                    <AvailabilityChoice label="No" checked={!availability.available} />
                  </div>
                  <div className="employee-step-overview__availability-details">
                    <div className="employee-step-overview__preference">
                      <strong>Preferences</strong>
                      <span>{valueOrBlank(availability.preferences)}</span>
                    </div>
                    <div className="employee-step-overview__preference">
                      <strong>Comments</strong>
                      <span>{valueOrBlank(availability.comments)}</span>
                    </div>
                  </div>
                </div>
              )}
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  );
}