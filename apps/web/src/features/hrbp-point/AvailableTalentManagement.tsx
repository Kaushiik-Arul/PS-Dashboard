"use client";
import { AvailableJdInput } from "./AvailableJdInput";
import { useRef, useState } from "react";
import { useAuth } from "@/auth/AuthProvider";
import { hasPermission } from "@/auth/permissions";
import "./hrbp-point.css";
import { AvailableTalentTable } from "./AvailableTalentTable";
import {
  availableClient,
  AvailableRequestError,
} from "./available-talent.http";
import {
  columnsFor,
  emptyAvailableValues,
  availableTitles,
  type AvailableIssue,
  type AvailableKind,
  type AvailableRecord,
  type AvailableValues,
} from "./available-talent.types";

export function AvailableTalentManagement({ kind }: { kind: AvailableKind }) {
  const { role } = useAuth();
  const canManage = hasPermission(role, "manageTalentPipeline");
  const editor = useRef<HTMLDialogElement>(null);
  const lastLookup = useRef("");
  const deletion = useRef<HTMLDialogElement>(null);
  const [refresh, setRefresh] = useState(0);
  const [editorVersion, setEditorVersion] = useState(0);
  const [jdBusy, setJdBusy] = useState(false);
  const [id, setId] = useState<string>();
  const [values, setValues] = useState<AvailableValues>(emptyAvailableValues);
  const [issues, setIssues] = useState<AvailableIssue[]>([]);
  const [message, setMessage] = useState("");
  const [lookupMessage, setLookupMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<AvailableRecord | null>(
    null,
  );
  const title = availableTitles[kind];
  const changed = () => setRefresh((value) => value + 1);
  const openEditor = (row?: AvailableRecord) => {
    setEditorVersion((current) => current + 1);
    setJdBusy(false);
    lastLookup.current = row?.pers_no ?? "";
    setId(row?.id);
    setValues(row ? { ...row } : emptyAvailableValues());
    setIssues([]);
    setMessage("");
    setLookupMessage("");
    editor.current?.showModal();
  };
  const lookup = async () => {
    if (!values.pers_no || lastLookup.current === values.pers_no) return;
    setBusy(true);
    setLookupMessage("");
    const persNo = values.pers_no;
    try {
      const { employee } = await availableClient(kind).lookup(persNo);
      lastLookup.current = persNo;
      if (employee) {
        setValues((current) =>
          current.pers_no !== persNo
            ? current
            : {
                ...current,
                employee_name: employee.employee_name ?? "",
                entity: employee.entity ?? "",
                department: employee.department ?? "",
                hrbp: employee.hrbp ?? "",
              },
        );
        setLookupMessage(
          "Details fetched from the current namelist. You can edit them.",
        );
      } else
        setLookupMessage(
          "Employee is not in the current namelist. Enter their details manually.",
        );
    } catch (error) {
      setLookupMessage(
        error instanceof Error ? error.message : "Could not fetch employee.",
      );
    } finally {
      setBusy(false);
    }
  };
  const save = async () => {
    if (jdBusy) return;
    setBusy(true);
    setMessage("");
    setIssues([]);
    try {
      const result = await availableClient(kind).save(values, id);
      editor.current?.close();
      changed();
      setMessage(
        result.issues.length
          ? `Saved with ${result.issues.length} warning(s). Entered values were retained.`
          : "Register row saved.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not save row.",
      );
      if (error instanceof AvailableRequestError) setIssues(error.issues);
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    if (!pendingDelete) return;
    setBusy(true);
    setMessage("");
    try {
      await availableClient(kind).remove(pendingDelete.id);
      deletion.current?.close();
      setPendingDelete(null);
      changed();
      setMessage("Register row deleted.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not delete row.",
      );
    } finally {
      setBusy(false);
    }
  };
  if (!canManage) return <AvailableTalentTable kind={kind} />;
  return (
    <section className="pool-management">
      {message && <p role="status">{message}</p>}
      <AvailableTalentTable
        kind={kind}
        refresh={refresh}
        onAdd={() => openEditor()}
        onEdit={openEditor}
        onDelete={(row) => {
          setPendingDelete(row);
          setMessage("");
          deletion.current?.showModal();
        }}
      />
      <dialog
        ref={editor}
        className="pool-manual-dialog"
        onCancel={(event) => {
          if (busy) event.preventDefault();
        }}
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <header className="namelist-editor__header">
            <h2>
              {id ? "Edit" : "Add"} {title} employee
            </h2>
            <button
              type="button"
              className="a-button a-button--integrated"
              aria-label="Close editor"
              disabled={busy}
              onClick={() => editor.current?.close()}
            >
              <i
                className="a-icon a-button__icon boschicon-bosch-ic-close"
                aria-hidden="true"
              />
            </button>
          </header>
          <div className="namelist-editor__fields">
            <p>
              Enter Pers.No. and leave the field to fetch current namelist
              details. You can override fetched values.
            </p>
            {lookupMessage && <p role="status">{lookupMessage}</p>}
            {columnsFor(kind).map(([key, label]) => (
              <label
                className={`hrbp-field ${issues.some((issue) => issue.column === key && issue.severity === "error") ? "has-error" : ""}`}
                key={key}
              >
                <span>{label}</span>
                {key === "jd_id" ? (
                  <AvailableJdInput
                    key={editorVersion}
                    onBusyChange={setJdBusy}
                    value={values.jd_id}
                    disabled={busy}
                    onChange={(jd_id) => {
                      setValues((current) => ({ ...current, jd_id }));
                      setIssues((current) =>
                        current.filter((issue) => issue.column !== "jd_id"),
                      );
                    }}
                  />
                ) : key === "preferences" || key === "comments" ? (
                  <textarea
                    rows={3}
                    value={values[key]}
                    disabled={busy}
                    maxLength={4000}
                    onChange={(event) =>
                      setValues((current) => ({
                        ...current,
                        [key]: event.target.value,
                      }))
                    }
                  />
                ) : (
                  <input
                    type="text"
                    value={values[key]}
                    disabled={busy}
                    maxLength={500}
                    onBlur={key === "pers_no" ? () => void lookup() : undefined}
                    onChange={(event) => {
                      const text = event.target.value;
                      if (key === "pers_no") lastLookup.current = "";
                      setValues((current) =>
                        key === "pers_no"
                          ? {
                              ...current,
                              pers_no: text,
                              employee_name: "",
                              entity: "",
                              department: "",
                              hrbp: "",
                            }
                          : { ...current, [key]: text },
                      );
                      setIssues((current) =>
                        current.filter((issue) => issue.column !== key),
                      );
                    }}
                  />
                )}
                {issues
                  .filter((issue) => issue.column === key)
                  .map((issue, index) => (
                    <small
                      key={index}
                      className={
                        issue.severity === "warning" ? "pool-warning" : ""
                      }
                    >
                      {issue.message}
                    </small>
                  ))}
              </label>
            ))}
            {message && (
              <p className="hrbp-dialog__error" role="alert">
                {message}
              </p>
            )}
          </div>
          <footer className="namelist-editor__footer">
            <button
              type="button"
              className="a-button a-button--secondary"
              disabled={busy}
              onClick={() => editor.current?.close()}
            >
              <span className="a-button__label">Cancel</span>
            </button>
            <button
              type="submit"
              className="a-button a-button--primary"
              disabled={busy || jdBusy}
            >
              <span className="a-button__label">
                {busy ? "Saving…" : "Save row"}
              </span>
            </button>
          </footer>
        </form>
      </dialog>
      <dialog
        ref={deletion}
        className="pool-delete-dialog"
        onCancel={(event) => {
          if (busy) event.preventDefault();
        }}
      >
        <h2>Delete register row?</h2>
        <p>
          Remove {pendingDelete?.employee_name} ({pendingDelete?.pers_no}) from{" "}
          {title}?
        </p>
        {message && <p role="alert">{message}</p>}
        <div className="namelist-editor__footer">
          <button
            type="button"
            className="a-button a-button--secondary"
            disabled={busy}
            onClick={() => deletion.current?.close()}
          >
            <span className="a-button__label">Cancel</span>
          </button>
          <button
            type="button"
            className="a-button a-button--primary"
            disabled={busy}
            onClick={() => void remove()}
          >
            <span className="a-button__label">Delete row</span>
          </button>
        </div>
      </dialog>
    </section>
  );
}
