"use client";

import { redirect } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { useAuth } from "@/auth/AuthProvider";
import { getCsrfToken } from "@/auth/csrf";
import { hasPermission } from "@/auth/permissions";
import {
  employeeStatusTypes,
  type EmployeeStatus,
  type EmployeeStatusType,
} from "./hrbp-point.types";
import { NamelistImportPanel } from "./NamelistImportPanel";
import { JdManagementPanel } from "./JdManagementPanel";
import { RbinExceptionsPanel } from "./RbinExceptionsPanel";
import { httpRbinExceptionsClient } from "./rbin-exceptions.http";
import { PppHistoryImportPanel } from "./PppHistoryImportPanel";
import { ActiveStepImportPanel } from "./ActiveStepImportPanel";
import "@/components/data-table/data-table.css";
import "./hrbp-point.css";

type FormState = {
  persNo: string;
  statusType: EmployeeStatusType;
  startDate: string;
  endDate: string;
};

const emptyForm: FormState = {
  persNo: "",
  statusType: "Maternity",
  startDate: "",
  endDate: "",
};

function sortRows(rows: EmployeeStatus[]) {
  return [...rows].sort((first, second) =>
    BigInt(first.persNo) < BigInt(second.persNo) ? -1 : 1,
  );
}

function formatDate(value: string | null) {
  if (!value) return "-";
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00Z` : value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", { timeZone: "UTC" }).format(date);
}

async function getErrorMessage(response: Response) {
  try {
    const body: unknown = await response.json();
    if (
      typeof body === "object" &&
      body !== null &&
      "message" in body &&
      typeof body.message === "string"
    ) return body.message;
  } catch {
    // Use the fallback for non-JSON failures.
  }
  return "The request could not be completed. Please try again.";
}

export function HrbpPointDashboard({ initialRows }: { initialRows: EmployeeStatus[] }) {
  const { role } = useAuth();
  const canManage = hasPermission(role, "manageEmployeeStatus");
  const canManageNamelist = hasPermission(role, "manageNamelist");
  const [rows, setRows] = useState(() => sortRows(initialRows));
  const [editingPersNo, setEditingPersNo] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EmployeeStatus | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const editorRef = useRef<HTMLDialogElement>(null);
  const deleteRef = useRef<HTMLDialogElement>(null);

  if (!hasPermission(role, "viewHrbpPoint")) redirect("/");

  const openCreate = () => {
    setEditingPersNo(null);
    setForm(emptyForm);
    setFormError("");
    editorRef.current?.showModal();
  };

  const openEdit = (row: EmployeeStatus) => {
    setEditingPersNo(row.persNo);
    setForm({ persNo: row.persNo, statusType: row.statusType, startDate: row.startDate ?? "", endDate: row.endDate ?? "" });
    setFormError("");
    editorRef.current?.showModal();
  };

  const submitForm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!/^[1-9]\d*$/.test(form.persNo)) {
      setFormError("Employee number must be a positive whole number.");
      return;
    }
    if (form.endDate && (!form.startDate || form.endDate < form.startDate)) {
      setFormError("End date must be on or after the start date.");
      return;
    }

    setIsSaving(true);
    setFormError("");
    const isEditing = editingPersNo !== null;
    const url = isEditing
      ? `/api/hrbp-point/employee-statuses/${encodeURIComponent(editingPersNo)}`
      : "/api/hrbp-point/employee-statuses";

    try {
      const csrfToken = getCsrfToken();
      const response = await fetch(url, {
        method: isEditing ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
          ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
        },
        body: JSON.stringify({
          ...(!isEditing ? { persNo: form.persNo } : {}),
          statusType: form.statusType,
          startDate: form.startDate || null,
          endDate: form.endDate || null,
        }),
      });
      if (!response.ok) {
        setFormError(await getErrorMessage(response));
        return;
      }

      const saved = (await response.json()) as EmployeeStatus;
      setRows((current) => sortRows(isEditing
        ? current.map((row) => (row.persNo === saved.persNo ? saved : row))
        : [...current, saved]));
      editorRef.current?.close();
    } catch {
      setFormError("The request could not be completed. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const openDelete = (row: EmployeeStatus) => {
    setDeleteTarget(row);
    setDeleteError("");
    deleteRef.current?.showModal();
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setDeleteError("");
    try {
      const csrfToken = getCsrfToken();
      const response = await fetch(`/api/hrbp-point/employee-statuses/${encodeURIComponent(deleteTarget.persNo)}`, {
        method: "DELETE",
        headers: csrfToken ? { "X-CSRF-Token": csrfToken } : {},
      });
      if (!response.ok) {
        setDeleteError(await getErrorMessage(response));
        return;
      }
      setRows((current) => current.filter((row) => row.persNo !== deleteTarget.persNo));
      deleteRef.current?.close();
      setDeleteTarget(null);
    } catch {
      setDeleteError("The request could not be completed. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <main className="hrbp-page">
      {canManageNamelist && <NamelistImportPanel />}
      {canManageNamelist && <JdManagementPanel />}

      <div className="hrbp-maintenance-grid">
      <section className="hrbp-status-panel" aria-labelledby="leave-status-title">
        <div className="hrbp-page__heading">
          <div>
            <p className="hrbp-section__eyebrow">Employee status maintenance</p>
            <h2 id="leave-status-title">Employee leave status</h2>
            <p>Maintain current maternity, sabbatical, CRL, and absconding records.</p>
          </div>
          {canManage && <button className="a-button a-button--primary -small hrbp-maintenance-add" type="button" onClick={openCreate}>
            <i className="a-icon a-button__icon boschicon-bosch-ic-add" aria-hidden="true" />
            <span className="a-button__label">Add status</span>
          </button>}
        </div>

        <section className="data-table-card hrbp-status-table" aria-label="Employee leave status records">
          <div className="data-table-card__header"><div>
            <h2 className="data-table-card__title">Current records</h2>
            <p className="data-table-card__description">{rows.length} employee status {rows.length === 1 ? "record" : "records"}</p>
          </div></div>
          <div className="data-table-scroll hrbp-compact-table-wrap">
            <table className="data-table hrbp-table">
              <thead><tr className="data-table__column-header">
                <th scope="col">Employee</th><th scope="col">Status</th><th scope="col">Period</th>
                {canManage && <th scope="col"><span className="visually-hidden">Actions</span></th>}
              </tr></thead>
              <tbody>{rows.length > 0 ? rows.map((row) => <tr key={row.persNo}>
                <td>{row.persNo}</td><td>{row.statusType}</td><td><span className="hrbp-period"><span>{formatDate(row.startDate)}</span><span>{formatDate(row.endDate)}</span></span></td>
                {canManage && <td><div className="hrbp-table__actions">
                  <button className="a-button a-button--integrated -small" type="button" title={`Edit ${row.persNo}`} aria-label={`Edit employee ${row.persNo}`} onClick={() => openEdit(row)}><i className="a-icon a-button__icon boschicon-bosch-ic-edit" aria-hidden="true" /></button>
                  <button className="a-button a-button--integrated -small" type="button" title={`Delete ${row.persNo}`} aria-label={`Delete employee ${row.persNo}`} onClick={() => openDelete(row)}><i className="a-icon a-button__icon boschicon-bosch-ic-delete" aria-hidden="true" /></button>
                </div></td>}
              </tr>) : <tr><td className="hrbp-table__empty" colSpan={canManage ? 4 : 3}>No employee leave statuses have been added.</td></tr>}</tbody>
            </table>
          </div>
        </section>
      </section>

      {canManageNamelist && <PppHistoryImportPanel />}
      {canManageNamelist && <ActiveStepImportPanel />}
      {canManageNamelist && <RbinExceptionsPanel client={httpRbinExceptionsClient} />}
      </div>

      <dialog className="hrbp-dialog" ref={editorRef} onClose={() => setFormError("")}>
        <form method="dialog" onSubmit={submitForm}>
          <header className="hrbp-dialog__header"><h2>{editingPersNo ? "Edit employee status" : "Add employee status"}</h2>
            <button className="a-button a-button--integrated" type="button" aria-label="Close" title="Close" disabled={isSaving} onClick={() => editorRef.current?.close()}><i className="a-icon a-button__icon boschicon-bosch-ic-close" aria-hidden="true" /></button>
          </header>
          <div className="hrbp-dialog__body">
            <label className="hrbp-field"><span>Employee number</span><input value={form.persNo} inputMode="numeric" required disabled={editingPersNo !== null || isSaving} onChange={(event) => setForm((current) => ({ ...current, persNo: event.target.value.trim() }))} /></label>
            <label className="hrbp-field"><span>Status</span><select value={form.statusType} disabled={isSaving} onChange={(event) => setForm((current) => ({ ...current, statusType: event.target.value as EmployeeStatusType }))}>{employeeStatusTypes.map((status) => <option key={status}>{status}</option>)}</select></label>
            <div className="hrbp-form__dates">
              <label className="hrbp-field"><span>Start date</span><input type="date" value={form.startDate} disabled={isSaving} onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))} /></label>
              <label className="hrbp-field"><span>End date</span><input type="date" value={form.endDate} min={form.startDate || undefined} disabled={isSaving} onChange={(event) => setForm((current) => ({ ...current, endDate: event.target.value }))} /></label>
            </div>
            {formError && <p className="hrbp-dialog__error" role="alert">{formError}</p>}
          </div>
          <footer className="hrbp-dialog__footer">
            <button className="a-button a-button--secondary" type="button" disabled={isSaving} onClick={() => editorRef.current?.close()}><span className="a-button__label">Cancel</span></button>
            <button className="a-button a-button--primary" type="submit" disabled={isSaving}><span className="a-button__label">{isSaving ? "Saving..." : "Save"}</span></button>
          </footer>
        </form>
      </dialog>

      <dialog className="hrbp-dialog hrbp-dialog--confirm" ref={deleteRef} onClose={() => setDeleteError("")}>
        <div className="hrbp-dialog__body"><h2>Delete employee status?</h2><p>This permanently deletes the {deleteTarget?.statusType} record for employee {deleteTarget?.persNo}.</p>{deleteError && <p className="hrbp-dialog__error" role="alert">{deleteError}</p>}</div>
        <div className="hrbp-dialog__footer">
          <button className="a-button a-button--secondary" type="button" disabled={isDeleting} onClick={() => deleteRef.current?.close()}><span className="a-button__label">Cancel</span></button>
          <button className="a-button a-button--primary" type="button" disabled={isDeleting} onClick={confirmDelete}><span className="a-button__label">{isDeleting ? "Deleting..." : "Delete"}</span></button>
        </div>
      </dialog>
    </main>
  );
}
