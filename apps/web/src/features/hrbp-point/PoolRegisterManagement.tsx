"use client";
import { PoolSelect } from "./PoolSelect";
import { useRef, useState } from "react";
import { useAuth } from "@/auth/AuthProvider";
import { hasPermission } from "@/auth/permissions";
import "./hrbp-point.css";
import { PoolRegisterTable } from "./PoolRegisterTable";
import { poolClient, PoolRequestError } from "./pool-register.http";
import {
  columnsFor,
  emptyPoolValues,
  poolTitles,
  type PoolIssue,
  type PoolKind,
  type PoolRecord,
  type PoolValues,
} from "./pool-register.types";

export function PoolRegisterManagement({ kind }: { kind: PoolKind }) {
  const { role } = useAuth();
  const canManage = hasPermission(role, "manageTalentPipeline");
  const editor = useRef<HTMLDialogElement>(null);
  const lastLookup = useRef("");
  const deletion = useRef<HTMLDialogElement>(null);
  const [refresh, setRefresh] = useState(0);
  const [id, setId] = useState<string>();
  const [values, setValues] = useState<PoolValues>(emptyPoolValues);
  const [issues, setIssues] = useState<PoolIssue[]>([]);
  const [message, setMessage] = useState("");
  const [lookupMessage, setLookupMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<PoolRecord | null>(null);
  const title = poolTitles[kind];
  const changed = () => setRefresh((value) => value + 1);
  const openEditor = (row?: PoolRecord) => {
    lastLookup.current = row?.pers_no ?? "";
    setId(row?.id);
    setValues(row ? { ...row } : emptyPoolValues());
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
      const { employee } = await poolClient(kind).lookup(persNo);
      lastLookup.current = persNo;
      if (employee) {
        setValues((current) =>
          current.pers_no !== persNo
            ? current
            : {
                ...current,
                employee_name: employee.employee_name ?? "",
                ps_group: employee.ps_group ?? "",
                department: employee.department ?? "",
                range: employee.range ?? "",
                gender: employee.gender ?? "",
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
    setBusy(true);
    setMessage("");
    setIssues([]);
    try {
      const result = await poolClient(kind).save(values, id);
      editor.current?.close();
      changed();
      setMessage(
        result.issues.length
          ? `Saved with ${result.issues.length} namelist warning(s). Entered values were retained.`
          : "Row saved.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not save row.",
      );
      if (error instanceof PoolRequestError) setIssues(error.issues);
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    if (!pendingDelete) return;
    setBusy(true);
    setMessage("");
    try {
      await poolClient(kind).remove(pendingDelete.id);
      deletion.current?.close();
      setPendingDelete(null);
      changed();
      setMessage("Row deleted.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not delete row.",
      );
    } finally {
      setBusy(false);
    }
  };
  if (!canManage) return <PoolRegisterTable kind={kind} />;
  return (
    <section className="pool-management">
      {message && <p role="status">{message}</p>}
      <PoolRegisterTable
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
              details. Dates use YYYY-MM-DD.
            </p>
            {lookupMessage && <p role="status">{lookupMessage}</p>}
            {columnsFor(kind).map(([key, label]) => (
              <label
                className={`hrbp-field ${issues.some((issue) => issue.column === key && issue.severity === "error") ? "has-error" : ""}`}
                key={key}
              >
                <span>{label}</span>
                {key === "pool" ? <PoolSelect kind={kind} value={values.pool} disabled={busy} onChange={pool => {
                  setValues(current => ({ ...current, pool }));
                  setIssues(current => current.filter(issue => issue.column !== "pool"));
                }} /> : (
                <input
                  type={
                    key === "start_date" || key === "end_date" ? "date" : "text"
                  }
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
                            ps_group: "",
                            department: "",
                            range: "",
                            gender: "",
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
              disabled={busy}
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
        <h2>Delete row?</h2>
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
