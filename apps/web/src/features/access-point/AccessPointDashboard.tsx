"use client";

import { redirect } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { getCsrfToken } from "@/auth/csrf";
import { hasPermission } from "@/auth/permissions";
import { useAuth } from "@/auth/AuthProvider";
import {
  managedRoleLabels,
  managedRoles,
  type AccessAssignment,
  type EmployeeCandidate,
  type ManagedRole,
  type ScopeOptions,
} from "./access-point.types";
import "@/components/data-table/data-table.css";
import "./access-point.css";

type AssignmentForm = {
  role: ManagedRole;
  assignedRange: string;
  assignedOrgUnit: string;
  assignedOrgUnits: string[];
  temporaryPassword: string;
};

const emptyForm: AssignmentForm = {
  role: "range_head",
  assignedRange: "",
  assignedOrgUnit: "",
  assignedOrgUnits: [],
  temporaryPassword: "",
};

async function errorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { message?: unknown };
    if (typeof body.message === "string") return body.message;
  } catch {
    // Use the generic message when the response is not JSON.
  }
  return "The request could not be completed.";
}

function formatTimestamp(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
}

export function AccessPointDashboard({
  assignments: initialAssignments,
  scopeOptions,
}: {
  assignments: AccessAssignment[];
  scopeOptions: ScopeOptions;
}) {
  const { role } = useAuth();
  const [assignments, setAssignments] = useState(initialAssignments);
  const [query, setQuery] = useState("");
  const [candidates, setCandidates] = useState<EmployeeCandidate[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeCandidate | null>(null);
  const [editing, setEditing] = useState<AccessAssignment | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<AccessAssignment | null>(null);
  const [form, setForm] = useState<AssignmentForm>(emptyForm);
  const [orgUnits, setOrgUnits] = useState(scopeOptions.orgUnits);
  const [message, setMessage] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const editorRef = useRef<HTMLDialogElement>(null);
  const deactivateRef = useRef<HTMLDialogElement>(null);

  if (!hasPermission(role, "manageAccessPoint")) redirect("/");

  const openCreate = () => {
    setEditing(null);
    setSelectedEmployee(null);
    setCandidates([]);
    setQuery("");
    setForm(emptyForm);
    setOrgUnits(scopeOptions.orgUnits);
    setMessage("");
    editorRef.current?.showModal();
  };

  const fetchOrgUnits = async (assignedRange: string) => {
    if (!assignedRange) {
      setOrgUnits(scopeOptions.orgUnits);
      return;
    }
    const response = await fetch(`/api/access-point/scope-options?range=${encodeURIComponent(assignedRange)}`).catch(() => null);
    if (!response?.ok) {
      setOrgUnits([]);
      setMessage("Unable to load Org Units for the selected Range.");
      return;
    }
    const result = (await response.json()) as ScopeOptions;
    setOrgUnits(result.orgUnits);
  };

  const changeRange = (assignedRange: string) => {
    setForm((current) => ({
      ...current,
      assignedRange,
      assignedOrgUnit: "",
      assignedOrgUnits: [],
    }));
    void fetchOrgUnits(assignedRange);
  };

  const toggleOrgUnit = (orgUnit: string) => {
    setForm((current) => ({
      ...current,
      assignedOrgUnits: current.assignedOrgUnits.includes(orgUnit)
        ? current.assignedOrgUnits.filter((item) => item !== orgUnit)
        : [...current.assignedOrgUnits, orgUnit],
    }));
  };

  const searchEmployees = async () => {
    setMessage("");
    setIsSearching(true);
    try {
      const response = await fetch(`/api/access-point/employees?query=${encodeURIComponent(query.trim())}`).catch(() => null);
      if (!response?.ok) {
        setMessage(response ? await errorMessage(response) : "The API is unavailable.");
        return;
      }
      const result = (await response.json()) as EmployeeCandidate[];
      setCandidates(result);
      if (result.length === 0) setMessage("No matching employee was found in the namelist.");
    } finally {
      setIsSearching(false);
    }
  };

  const selectEmployee = (employee: EmployeeCandidate) => {
    setSelectedEmployee(employee);
    setForm({
      ...emptyForm,
      assignedRange: employee.range ?? "",
      assignedOrgUnit: employee.orgUnit ?? "",
    });
    setMessage("");
    if (employee.range) void fetchOrgUnits(employee.range);
  };

  const openEdit = (assignment: AccessAssignment) => {
    setEditing(assignment);
    setSelectedEmployee(null);
    setForm({
      role: assignment.role,
      assignedRange: assignment.assignedRange ?? "",
      assignedOrgUnit: assignment.assignedOrgUnit ?? "",
      assignedOrgUnits: assignment.assignedOrgUnit
        ? [assignment.assignedOrgUnit]
        : [],
      temporaryPassword: "",
    });
    setOrgUnits(scopeOptions.orgUnits);
    setMessage("");
    if (assignment.assignedRange) void fetchOrgUnits(assignment.assignedRange);
    editorRef.current?.showModal();
  };

  const submitAssignment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editing && !selectedEmployee) {
      setMessage("Select an employee from the namelist search results.");
      return;
    }
    if (!editing && form.role === "department_head" && form.assignedOrgUnits.length === 0) {
      setMessage("Select at least one Org Unit.");
      return;
    }
    setIsSaving(true);
    setMessage("");
    const csrfToken = getCsrfToken();
    const selectedOrgUnits = !editing && form.role === "department_head"
      ? form.assignedOrgUnits
      : [form.assignedOrgUnit];
    const savedAssignments: AccessAssignment[] = [];

    for (const assignedOrgUnit of selectedOrgUnits) {
      const response = await fetch(
        editing
          ? `/api/access-point/assignments/${encodeURIComponent(editing.assignmentId)}`
          : "/api/access-point/assignments",
        {
          method: editing ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
            ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
          },
          body: JSON.stringify({
            ...(!editing ? {
              persNo: selectedEmployee?.persNo,
              temporaryPassword: form.temporaryPassword || undefined,
            } : {}),
            role: form.role,
            assignedRange: form.role === "admin" ? null : form.assignedRange,
            assignedOrgUnit:
              form.role === "department_head" || form.role === "sub_department_head"
                ? assignedOrgUnit
                : null,
          }),
        },
      ).catch(() => null);
      if (!response?.ok) {
        setAssignments((current) => [...current, ...savedAssignments]
          .sort((a, b) => a.employeeName.localeCompare(b.employeeName)));
        setMessage(response ? await errorMessage(response) : "The API is unavailable.");
        setIsSaving(false);
        return;
      }
      savedAssignments.push((await response.json()) as AccessAssignment);
    }

    setAssignments((current) => editing
      ? current.map((item) => item.assignmentId === savedAssignments[0].assignmentId
        ? savedAssignments[0]
        : item)
      : [...current, ...savedAssignments].sort((a, b) => a.employeeName.localeCompare(b.employeeName)));
    setIsSaving(false);
    editorRef.current?.close();
  };

  const confirmDeactivate = async () => {
    if (!deactivateTarget) return;
    setIsDeactivating(true);
    setMessage("");
    const csrfToken = getCsrfToken();
    const response = await fetch(
      `/api/access-point/accounts/${encodeURIComponent(deactivateTarget.accountId)}`,
      { method: "DELETE", headers: csrfToken ? { "X-CSRF-Token": csrfToken } : {} },
    ).catch(() => null);
    if (!response?.ok) {
      setMessage(response ? await errorMessage(response) : "The API is unavailable.");
      setIsDeactivating(false);
      return;
    }
    setAssignments((current) => current.map((item) =>
      item.accountId === deactivateTarget.accountId
        ? { ...item, accountStatus: "inactive" }
        : item));
    setIsDeactivating(false);
    deactivateRef.current?.close();
    setDeactivateTarget(null);
  };

  const requiresRange = form.role !== "admin";
  const requiresSingleOrgUnit = editing
    ? form.role === "department_head" || form.role === "sub_department_head"
    : form.role === "sub_department_head";
  const requiresMultipleOrgUnits = !editing && form.role === "department_head";
  const employee = editing
    ? { employeeName: editing.employeeName, persNo: editing.persNo, email: editing.email, designation: null }
    : selectedEmployee;

  return (
    <main className="access-point">
      <section className="access-point__heading" aria-labelledby="access-point-title">
        <div>
          <h1 id="access-point-title">Access Point</h1>
          <p>Onboard administrators and Heads, then maintain their authorized workforce scope.</p>
        </div>
        <button className="a-button a-button--primary" type="button" onClick={openCreate}>
          <i className="a-icon a-button__icon boschicon-bosch-ic-add" aria-hidden="true" />
          <span className="a-button__label">Add access</span>
        </button>
      </section>

      <section className="data-table-card" aria-label="Current access assignments">
        <div className="data-table-card__header"><div>
          <h2 className="data-table-card__title">Current access</h2>
          <p className="data-table-card__description">{assignments.length} role {assignments.length === 1 ? "assignment" : "assignments"}</p>
        </div></div>
        <div className="data-table-scroll">
          <table className="data-table access-point__table">
            <thead><tr className="data-table__column-header">
              <th scope="col">Employee</th><th scope="col">Role</th><th scope="col">Range</th><th scope="col">Org Unit</th><th scope="col">Status</th><th scope="col">Updated</th><th scope="col"><span className="visually-hidden">Actions</span></th>
            </tr></thead>
            <tbody>{assignments.length ? assignments.map((assignment) => (
              <tr key={assignment.assignmentId}>
                <td><strong>{assignment.employeeName}</strong><span className="access-point__secondary">{assignment.persNo} · {assignment.email}</span></td>
                <td>{managedRoleLabels[assignment.role]}</td>
                <td>{assignment.assignedRange ?? "All"}</td>
                <td>{assignment.assignedOrgUnit ?? "All"}</td>
                <td><span className={`access-point__status access-point__status--${assignment.accountStatus}`}>{assignment.accountStatus}</span></td>
                <td>{formatTimestamp(assignment.updatedAt)}</td>
                <td className="access-point__actions">
                  <button className="a-button a-button--integrated -small" type="button" title="Edit assignment" aria-label={`Edit ${assignment.employeeName} assignment`} disabled={assignment.accountStatus === "inactive"} onClick={() => openEdit(assignment)}><i className="a-icon a-button__icon boschicon-bosch-ic-edit" aria-hidden="true" /></button>
                  <button className="a-button a-button--integrated -small" type="button" title="Deactivate account" aria-label={`Deactivate ${assignment.employeeName}`} disabled={assignment.accountStatus === "inactive"} onClick={() => { setDeactivateTarget(assignment); setMessage(""); deactivateRef.current?.showModal(); }}><i className="a-icon a-button__icon boschicon-bosch-ic-delete" aria-hidden="true" /></button>
                </td>
              </tr>
            )) : <tr><td className="access-point__empty" colSpan={7}>No access assignments have been created.</td></tr>}</tbody>
          </table>
        </div>
      </section>

      <dialog className="access-point__dialog" ref={editorRef} onClose={() => setMessage("")}>
        <form onSubmit={submitAssignment}>
          <header className="access-point__dialog-header">
            <h2>{editing ? "Edit access assignment" : "Add access assignment"}</h2>
            <button className="a-button a-button--integrated" type="button" aria-label="Close" title="Close" disabled={isSaving} onClick={() => editorRef.current?.close()}><i className="a-icon a-button__icon boschicon-bosch-ic-close" aria-hidden="true" /></button>
          </header>
          <div className="access-point__dialog-body">
            {!editing && !selectedEmployee && <div className="access-point__search">
              <label htmlFor="employee-search">Employee name or personnel number*</label>
              <div className="access-point__search-controls">
                <input id="employee-search" value={query} minLength={2} required autoComplete="off" onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void searchEmployees(); } }} />
                <button className="a-button a-button--secondary" type="button" disabled={isSearching || query.trim().length < 2} onClick={() => void searchEmployees()}><span className="a-button__label">{isSearching ? "Searching..." : "Search"}</span></button>
              </div>
              {candidates.length > 0 && <ul className="access-point__results">{candidates.map((candidate) => <li key={candidate.persNo}><button type="button" onClick={() => selectEmployee(candidate)}><strong>{candidate.employeeName}</strong><span>{candidate.persNo} · {candidate.email ?? "No official email"}</span></button></li>)}</ul>}
            </div>}

            {employee && <div className="access-point__employee">
              <div><span>Employee</span><strong>{employee.employeeName}</strong></div>
              <div><span>Personnel number</span><strong>{employee.persNo}</strong></div>
              <div><span>Official email</span><strong>{employee.email ?? "Not available"}</strong></div>
              <div><span>Designation</span><strong>{employee.designation ?? "Not available"}</strong></div>
            </div>}

            {employee && <>
              <label className="access-point__field"><span>Role*</span><select value={form.role} disabled={isSaving} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value as ManagedRole, assignedRange: event.target.value === "admin" ? "" : current.assignedRange, assignedOrgUnit: "", assignedOrgUnits: [] }))}>{managedRoles.map((item) => <option value={item} key={item}>{managedRoleLabels[item]}</option>)}</select></label>
              {requiresRange && <label className="access-point__field"><span>Range*</span><select required value={form.assignedRange} disabled={isSaving} onChange={(event) => changeRange(event.target.value)}><option value="">Select Range</option>{scopeOptions.ranges.map((item) => <option key={item}>{item}</option>)}</select></label>}
              {requiresSingleOrgUnit && <label className="access-point__field"><span>Accessible Org Unit*</span><select required value={form.assignedOrgUnit} disabled={isSaving || !form.assignedRange} onChange={(event) => setForm((current) => ({ ...current, assignedOrgUnit: event.target.value }))}><option value="">Select Org Unit</option>{orgUnits.map((item) => <option key={item}>{item}</option>)}</select></label>}
              {requiresMultipleOrgUnits && <fieldset className="access-point__field access-point__multi-select" disabled={isSaving || !form.assignedRange}><legend>Accessible Org Units*</legend><div className="access-point__multi-options">{orgUnits.map((item) => <label key={item}><input type="checkbox" checked={form.assignedOrgUnits.includes(item)} onChange={() => toggleOrgUnit(item)} /><span>{item}</span></label>)}</div><small>{form.assignedOrgUnits.length} selected</small></fieldset>}
              {!editing && selectedEmployee && !selectedEmployee.hasAccount && <label className="access-point__field"><span>Temporary password*</span><input type="password" minLength={12} required autoComplete="new-password" value={form.temporaryPassword} disabled={isSaving} onChange={(event) => setForm((current) => ({ ...current, temporaryPassword: event.target.value }))} /><small>Use at least 12 characters. The employee must change it after signing in.</small></label>}
              {!editing && selectedEmployee?.hasAccount && <p className="access-point__notice">An account already exists. This role will be added as another assignment; its password will not change.</p>}
            </>}
            {message && <p className="access-point__error" role="alert">{message}</p>}
          </div>
          <footer className="access-point__dialog-footer">
            <button className="a-button a-button--secondary" type="button" disabled={isSaving} onClick={() => editorRef.current?.close()}><span className="a-button__label">Cancel</span></button>
            {employee && <button className="a-button a-button--primary" type="submit" disabled={isSaving}><span className="a-button__label">{isSaving ? "Saving..." : editing ? "Save changes" : "Create access"}</span></button>}
          </footer>
        </form>
      </dialog>

      <dialog className="access-point__dialog access-point__dialog--confirm" ref={deactivateRef} onClose={() => setMessage("")}>
        <div className="access-point__dialog-body"><h2>Deactivate account?</h2><p>{deactivateTarget?.employeeName} will immediately lose access and all active sessions will be revoked. Audit history is preserved.</p>{message && <p className="access-point__error" role="alert">{message}</p>}</div>
        <footer className="access-point__dialog-footer"><button className="a-button a-button--secondary" type="button" disabled={isDeactivating} onClick={() => deactivateRef.current?.close()}><span className="a-button__label">Cancel</span></button><button className="a-button a-button--primary" type="button" disabled={isDeactivating} onClick={() => void confirmDeactivate()}><span className="a-button__label">{isDeactivating ? "Deactivating..." : "Deactivate"}</span></button></footer>
      </dialog>
    </main>
  );
}
