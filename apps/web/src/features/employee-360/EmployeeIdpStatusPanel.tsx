"use client";

import { useState, type FormEvent } from "react";
import type { EmployeeIdpStatus } from "./employee-360.types";
import { updateIdpStatus } from "./idp-status.http";

function StatusChoice({ label, checked }: { label: string; checked: boolean }) {
  return (
    <label className="employee-idp-status__choice">
      <input type="checkbox" checked={checked} disabled />
      <span>{label}</span>
    </label>
  );
}

export function EmployeeIdpStatusPanel({
  persNo,
  initialStatus,
  canEdit,
}: {
  persNo: string;
  initialStatus: EmployeeIdpStatus;
  canEdit: boolean;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [editing, setEditing] = useState(false);
  const [draftAvailable, setDraftAvailable] = useState(initialStatus.available);
  const [draftComments, setDraftComments] = useState(initialStatus.comments ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const openEditor = () => {
    setDraftAvailable(status.available);
    setDraftComments(status.comments ?? "");
    setMessage("");
    setEditing(true);
  };

  const saveStatus = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const updated = await updateIdpStatus(persNo, {
        available: draftAvailable,
        comments: draftAvailable ? draftComments : null,
      });
      setStatus(updated);
      setEditing(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "IDP status could not be updated.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="employee-profile__panel employee-profile__panel--idp">
      <header>
        <i className="a-icon boschicon-bosch-ic-document" aria-hidden="true" />
        <h2>IDP status</h2>
        {canEdit && !editing && (
          <button className="a-button a-button--integrated -small employee-idp-status__edit" type="button" title="Edit IDP status" aria-label="Edit IDP status" onClick={openEditor}>
            <i className="a-icon a-button__icon boschicon-bosch-ic-edit" aria-hidden="true" />
          </button>
        )}
      </header>

      {editing ? (
        <form className="employee-idp-status__editor" onSubmit={saveStatus}>
          <fieldset disabled={saving}>
            <legend>IDP available</legend>
            <div className="employee-idp-status__choices">
              <label className="employee-idp-status__choice">
                <input type="radio" name={`idp-status-${persNo}`} checked={draftAvailable} onChange={() => setDraftAvailable(true)} />
                <span>Yes</span>
              </label>
              <label className="employee-idp-status__choice">
                <input type="radio" name={`idp-status-${persNo}`} checked={!draftAvailable} onChange={() => setDraftAvailable(false)} />
                <span>No</span>
              </label>
            </div>
            <label>
              <span>Comments</span>
              <textarea rows={3} maxLength={4000} disabled={!draftAvailable || saving} value={draftComments} onChange={(event) => setDraftComments(event.target.value)} />
            </label>
          </fieldset>
          {message && <p className="employee-idp-status__error" role="alert">{message}</p>}
          <div className="employee-idp-status__editor-actions">
            <button className="a-button a-button--secondary -small" type="button" disabled={saving} onClick={() => setEditing(false)}><span className="a-button__label">Cancel</span></button>
            <button className="a-button a-button--primary -small" type="submit" disabled={saving}><span className="a-button__label">{saving ? "Saving..." : "Save"}</span></button>
          </div>
        </form>
      ) : (
        <div className={`employee-idp-status__content employee-idp-status__content--${status.available ? "available" : "unavailable"}`}>
          <div className="employee-idp-status__availability">
            <strong>IDP available</strong>
            <div className="employee-idp-status__choices" aria-label="IDP available">
              <StatusChoice label="Yes" checked={status.available} />
              <StatusChoice label="No" checked={!status.available} />
            </div>
          </div>
          <div className="employee-idp-status__comments">
            <strong>Comments</strong>
            <span>{status.comments?.trim() || "Not available"}</span>
          </div>
        </div>
      )}
    </section>
  );
}