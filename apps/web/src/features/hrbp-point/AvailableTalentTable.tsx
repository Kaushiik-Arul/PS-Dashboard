"use client";
import { useEffect, useState } from "react";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/data-table/DataTable";
import { availableClient } from "./available-talent.http";
import {
  columnsFor,
  availableTitles,
  type AvailableKind,
  type AvailableRecord,
} from "./available-talent.types";

export function AvailableTalentTable({
  kind,
  refresh = 0,
  onAdd,
  onEdit,
  onDelete,
}: {
  kind: AvailableKind;
  refresh?: number;
  onAdd?: () => void;
  onEdit?: (row: AvailableRecord) => void;
  onDelete?: (row: AvailableRecord) => void;
}) {
  const [rows, setRows] = useState<AvailableRecord[]>([]);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    availableClient(kind)
      .list(controller.signal)
      .then((data) => {
        setRows(data);
        setError("");
        setLoaded(true);
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setError(
            reason instanceof Error
              ? reason.message
              : "Could not load register.",
          );
          setLoaded(true);
        }
      });
    return () => controller.abort();
  }, [kind, refresh]);
  const columns: DataTableColumn<AvailableRecord>[] = columnsFor(kind).map(
    ([key, label]) => ({
      key,
      label,
      filterable: true,
      group: ["pers_no", "employee_name"].includes(key)
        ? "Employee"
        : ["entity", "department", "hrbp"].includes(key)
          ? "Organization"
          : "STEP Details",
    }),
  );
  if (onEdit && onDelete)
    columns.push({
      key: "id",
      label: "Actions",
      group: "Actions",
      exportable: false,
      render: (_, row) => (
        <div className="active-step-row-actions">
          <button
            type="button"
            className="a-button a-button--integrated -small"
            aria-label={`Edit ${row.employee_name}`}
            onClick={() => onEdit(row)}
          >
            <i
              className="a-icon a-button__icon boschicon-bosch-ic-edit"
              aria-hidden="true"
            />
          </button>
          <button
            type="button"
            className="a-button a-button--integrated -small"
            aria-label={`Delete ${row.employee_name}`}
            onClick={() => onDelete(row)}
          >
            <i
              className="a-icon a-button__icon boschicon-bosch-ic-delete"
              aria-hidden="true"
            />
          </button>
        </div>
      ),
    });
  return (
    <div className="pool-register-table">
      {!loaded && <p role="status">Loading {availableTitles[kind]}…</p>}
      {error && <p role="alert">{error}</p>}
      <DataTable
        title={availableTitles[kind]}
        description="Employees available or planned for STEP assignments"
        columns={columns}
        rows={rows}
        getRowKey={(row) => row.id}
        downloadFileName={"step-available-talent"}
        pageSizeOptions={[5, 10, 25]}
        headerActions={
          onAdd ? (
            <button
              type="button"
              className="a-button a-button--integrated data-table-card__action"
              title="Add employee"
              onClick={onAdd}
              aria-label={`Add employee to ${availableTitles[kind]}`}
            >
              <i
                className="a-icon a-button__icon boschicon-bosch-ic-add"
                aria-hidden="true"
              />
            </button>
          ) : undefined
        }
        groupFilters
      />
    </div>
  );
}
