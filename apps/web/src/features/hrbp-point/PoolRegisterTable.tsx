"use client";
import { useEffect, useState } from "react";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/data-table/DataTable";
import { poolClient } from "./pool-register.http";
import {
  columnsFor,
  poolTitles,
  type PoolKind,
  type PoolRecord,
} from "./pool-register.types";

export function PoolRegisterTable({
  kind,
  refresh = 0,
  onAdd,
  onEdit,
  onDelete,
}: {
  kind: PoolKind;
  refresh?: number;
  onAdd?: () => void;
  onEdit?: (row: PoolRecord) => void;
  onDelete?: (row: PoolRecord) => void;
}) {
  const [rows, setRows] = useState<PoolRecord[]>([]);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    poolClient(kind)
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
              : "Could not load data.",
          );
          setLoaded(true);
        }
      });
    return () => controller.abort();
  }, [kind, refresh]);
  const columns: DataTableColumn<PoolRecord>[] = columnsFor(kind).map(
    ([key, label]) => ({
      key,
      label,
      filterable: true,
      group: ["start_date", "end_date"].includes(key)
        ? "Pool Period"
        : ["pool", "active_passive"].includes(key)
          ? "Pool"
          : ["ps_group", "department", "department_feb", "range"].includes(key)
            ? "Organization"
            : "Employee",
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
      {!loaded && <p role="status">Loading {poolTitles[kind]}…</p>}
      {error && <p role="alert">{error}</p>}
      <DataTable
        title={poolTitles[kind]}
        description="Current data · dates shown as YYYY-MM-DD"
        columns={columns}
        rows={rows}
        getRowKey={(row) => row.id}
        downloadFileName={`${kind}-pool-register`}
        pageSizeOptions={[5, 10, 25]}
        headerActions={onAdd ? <button type="button" className="a-button a-button--integrated data-table-card__action" title="Add employee" onClick={onAdd} aria-label={`Add employee to ${poolTitles[kind]}`}><i className="a-icon a-button__icon boschicon-bosch-ic-add" aria-hidden="true" /></button> : undefined}
        groupFilters
      />
    </div>
  );
}
