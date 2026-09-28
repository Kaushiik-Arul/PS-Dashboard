"use client";

import { useRef, useState, type FormEvent } from "react";
import { careerJourneyClient } from "./career-journey.http";
import type { CareerJourneyEvent, CareerJourneyInput } from "./employee-360.types";

const emptyInput = (): CareerJourneyInput => ({
  eventMonth: new Date().toISOString().slice(0, 7) + "-01",
  oldOrganisationalAreaPa: null, newOrganisationalAreaPa: null,
  oldOrganizationalUnit: null, newOrganizationalUnit: null,
  oldPsGroup: null, newPsGroup: null, notes: null,
});

const eventLabels: Record<CareerJourneyEvent["eventType"], string> = {
  entry_to_ps: "Entry to PS", internal_ps_change: "Internal PS change", manual: "Manual record", job_description_change: "Job description change",
};

function dateLabel(event: CareerJourneyEvent) {
  const options: Intl.DateTimeFormatOptions = event.eventType === "job_description_change"
    ? { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }
    : { month: "short", year: "numeric", timeZone: "UTC" };
  return new Intl.DateTimeFormat("en-GB", options).format(new Date(`${event.eventMonth}T00:00:00Z`));
}

function movement(oldValue: string | null, newValue: string | null) {
  return <span className="career-journey__movement"><span>{oldValue || "Not available"}</span><i className="a-icon boschicon-bosch-ic-forward-right" aria-hidden="true" /><strong>{newValue || "Not available"}</strong></span>;
}

export function CareerJourneyPanel({ persNo, initialEvents, canEdit }: { persNo: string; initialEvents: CareerJourneyEvent[]; canEdit: boolean }) {
  const editorRef = useRef<HTMLDialogElement>(null);
  const deleteRef = useRef<HTMLDialogElement>(null);
  const [localEvents, setLocalEvents] = useState({ source: initialEvents, rows: initialEvents });
  const events = localEvents.source === initialEvents ? localEvents.rows : initialEvents;
  const [editing, setEditing] = useState<CareerJourneyEvent | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CareerJourneyEvent | null>(null);
  const [draft, setDraft] = useState<CareerJourneyInput>(emptyInput);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const openEditor = (event?: CareerJourneyEvent) => {
    setEditing(event ?? null); setMessage("");
    setDraft(event ? {
      eventMonth: event.eventMonth, oldOrganisationalAreaPa: event.oldOrganisationalAreaPa,
      newOrganisationalAreaPa: event.newOrganisationalAreaPa,
      oldOrganizationalUnit: event.oldOrganizationalUnit, newOrganizationalUnit: event.newOrganizationalUnit,
      oldPsGroup: event.oldPsGroup, newPsGroup: event.newPsGroup, notes: event.notes,
    } : emptyInput());
    editorRef.current?.showModal();
  };
  const setValue = (key: keyof CareerJourneyInput, value: string) => setDraft((current) => ({ ...current, [key]: value || null }));
  const save = async (formEvent: FormEvent<HTMLFormElement>) => {
    formEvent.preventDefault(); setBusy(true); setMessage("");
    try {
      const saved = editing
        ? await careerJourneyClient.update(persNo, editing.id, draft)
        : await careerJourneyClient.create(persNo, draft);
      setLocalEvents((current) => ({
        source: initialEvents,
        rows: [saved, ...(current.source === initialEvents ? current.rows : initialEvents).filter((item) => item.id !== saved.id)]
          .sort((left, right) => right.eventMonth.localeCompare(left.eventMonth)),
      }));
      editorRef.current?.close();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Career Journey event could not be saved."); }
    finally { setBusy(false); }
  };
  const remove = async () => {
    if (!deleteTarget) return;
    setBusy(true); setMessage("");
    try {
      await careerJourneyClient.delete(persNo, deleteTarget.id);
      setLocalEvents((current) => ({
        source: initialEvents,
        rows: (current.source === initialEvents ? current.rows : initialEvents).filter((item) => item.id !== deleteTarget.id),
      }));
      deleteRef.current?.close(); setDeleteTarget(null);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Career Journey event could not be deleted."); }
    finally { setBusy(false); }
  };

  return <section className="employee-profile__panel employee-profile__panel--career" aria-labelledby="career-journey-title">
    <header><div><p className="employee-profile__eyebrow">Career and JD history</p><h2 id="career-journey-title">Employee movement history</h2></div>{canEdit && <button className="a-button a-button--primary -small" type="button" onClick={() => openEditor()}><i className="a-icon a-button__icon boschicon-bosch-ic-add" aria-hidden="true" /><span className="a-button__label">Add event</span></button>}</header>
    {events.length ? <div className="career-journey__table-wrap"><table className="career-journey__table"><thead><tr><th scope="col">Date</th><th scope="col">Event</th><th scope="col">Organizational area</th><th scope="col">Organizational unit</th><th scope="col">PS group</th><th scope="col">Job description</th><th scope="col">Notes</th>{canEdit && <th scope="col"><span className="visually-hidden">Actions</span></th>}</tr></thead><tbody>{events.map((event) => <tr key={event.id}><td>{dateLabel(event)}</td><td><span className={`career-journey__source career-journey__source--${event.source}`}>{eventLabels[event.eventType]}</span></td><td>{event.readOnly ? "-" : movement(event.oldOrganisationalAreaPa, event.newOrganisationalAreaPa)}</td><td>{event.readOnly ? "-" : movement(event.oldOrganizationalUnit, event.newOrganizationalUnit)}</td><td>{event.readOnly ? "-" : movement(event.oldPsGroup, event.newPsGroup)}</td><td>{event.eventType === "job_description_change" ? movement(event.oldJdName, event.newJdName) : "-"}</td><td>{event.notes || "-"}</td>{canEdit && <td className="career-journey__actions">{!event.readOnly && <><button className="a-button a-button--integrated -small" type="button" title="Edit event" aria-label={`Edit Career Journey event for ${dateLabel(event)}`} onClick={() => openEditor(event)}><i className="a-icon a-button__icon boschicon-bosch-ic-edit" aria-hidden="true" /></button><button className="a-button a-button--integrated -small" type="button" title="Delete event" aria-label={`Delete Career Journey event for ${dateLabel(event)}`} onClick={() => { setDeleteTarget(event); setMessage(""); deleteRef.current?.showModal(); }}><i className="a-icon a-button__icon boschicon-bosch-ic-delete" aria-hidden="true" /></button></>}</td>}</tr>)}</tbody></table></div> : <p className="career-journey__empty">No Career Journey records available.</p>}

    <dialog className="career-journey__dialog" ref={editorRef} onClose={() => setEditing(null)}><form onSubmit={save}><header><div><span>{editing ? "Edit history" : "New history"}</span><h2>{editing ? "Update Career Journey event" : "Add Career Journey event"}</h2></div><button className="a-button a-button--integrated" type="button" aria-label="Close Career Journey editor" onClick={() => editorRef.current?.close()}><i className="a-icon a-button__icon boschicon-bosch-ic-close" aria-hidden="true" /></button></header><div className="career-journey__form"><label><span>Event month</span><input type="month" required disabled={editing?.source === "rbin"} value={draft.eventMonth.slice(0, 7)} onChange={(event) => setDraft((current) => ({ ...current, eventMonth: `${event.target.value}-01` }))} /></label>{([['oldOrganisationalAreaPa', 'Previous organizational area'], ['newOrganisationalAreaPa', 'New organizational area'], ['oldOrganizationalUnit', 'Previous organizational unit'], ['newOrganizationalUnit', 'New organizational unit'], ['oldPsGroup', 'Previous PS group'], ['newPsGroup', 'New PS group']] as [keyof CareerJourneyInput, string][]).map(([key, label]) => <label key={key}><span>{label}</span><input maxLength={500} value={draft[key] ?? ""} onChange={(event) => setValue(key, event.target.value)} /></label>)}<label className="career-journey__notes"><span>Notes</span><textarea maxLength={1000} rows={3} value={draft.notes ?? ""} onChange={(event) => setValue("notes", event.target.value)} /></label>{message && <p className="career-journey__error" role="alert">{message}</p>}</div><footer><button className="a-button a-button--secondary" type="button" disabled={busy} onClick={() => editorRef.current?.close()}><span className="a-button__label">Cancel</span></button><button className="a-button a-button--primary" type="submit" disabled={busy}><span className="a-button__label">{busy ? "Saving..." : "Save event"}</span></button></footer></form></dialog>
    <dialog className="career-journey__dialog career-journey__dialog--confirm" ref={deleteRef} onClose={() => setDeleteTarget(null)}><div><header><div><span>Delete history</span><h2>Remove Career Journey event?</h2></div><button className="a-button a-button--integrated" type="button" aria-label="Close delete confirmation" onClick={() => deleteRef.current?.close()}><i className="a-icon a-button__icon boschicon-bosch-ic-close" aria-hidden="true" /></button></header><div className="career-journey__form"><p>This removes the {deleteTarget ? dateLabel(deleteTarget) : "selected"} event from the visible history.</p>{message && <p className="career-journey__error" role="alert">{message}</p>}</div><footer><button className="a-button a-button--secondary" type="button" disabled={busy} onClick={() => deleteRef.current?.close()}><span className="a-button__label">Cancel</span></button><button className="a-button a-button--primary" type="button" disabled={busy} onClick={() => void remove()}><i className="a-icon a-button__icon boschicon-bosch-ic-delete" aria-hidden="true" /><span className="a-button__label">{busy ? "Deleting..." : "Delete event"}</span></button></footer></div></dialog>
  </section>;
}
