import {
  namelistColumns,
  type NamelistColumn,
  type NamelistImportClient,
  type NamelistIssue,
  type NamelistPreview,
  type NamelistPreviewRow,
  type NamelistRowValues,
  type PreviewFilter,
} from "./namelist-import.types";

const previews = new Map<string, NamelistPreviewRow[]>();
const previewMetadata = new Map<string, { reportingMonth: string; importMode: "live" | "historical" }>();
const pageSize = 5;

const dateColumns = new Set<NamelistColumn>([
  "birth_date", "joining_date", "entry_for_retirement", "technical_entry_date",
]);
const numberColumns = new Set<NamelistColumn>(["pers_no", "global_id", "hrbp_global_id"]);

function makeValues(index: number): NamelistRowValues {
  const values = Object.fromEntries(namelistColumns.map((column) => [column, `${column}-${index}`])) as NamelistRowValues;
  values.pers_no = String(100000 + index);
  values.personnel_number = `PS-${100000 + index}`;
  values.employee_group = index === 3 ? "Outbound" : "Regular";
  values.function = index === 3 ? "" : "Engineering";
  values.global_id = String(900000 + index);
  values.hrbp_global_id = "700001";
  values.birth_date = "1990-05-14";
  values.joining_date = "2020-02-03";
  values.entry_for_retirement = "2050-05-31";
  values.technical_entry_date = "2020-02-03";
  values.official_email = `employee.${index}@example.com`;
  values.range = "PS/HR";
  values.organizational_unit = "People Services";
  return values;
}

function validate(values: NamelistRowValues): NamelistIssue[] {
  const issues: NamelistIssue[] = [];
  for (const column of namelistColumns) {
    const value = values[column].trim();
    const allowsBlankFunction = column === "function" && values.employee_group.trim().toLowerCase() === "outbound";
    if (!value && !allowsBlankFunction) issues.push({ column, message: "Required value is missing." });
    if (value && numberColumns.has(column) && !/^[1-9]\d*$/.test(value)) {
      issues.push({ column, message: "Enter a positive whole number." });
    }
    if (value && dateColumns.has(column) && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      issues.push({ column, message: "Use YYYY-MM-DD." });
    }
  }
  if (values.official_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.official_email)) {
    issues.push({ column: "official_email", message: "Enter a valid email address." });
  }
  return issues;
}

function revalidate(rows: NamelistPreviewRow[]) {
  const counts = new Map<string, number>();
  rows.forEach((row) => counts.set(row.values.pers_no, (counts.get(row.values.pers_no) ?? 0) + 1));
  return rows.map((row) => {
    const issues = validate(row.values);
    if (row.values.pers_no && (counts.get(row.values.pers_no) ?? 0) > 1) {
      issues.push({ column: "pers_no", message: "Employee number is duplicated in this file." });
    }
    return { ...row, issues };
  });
}

function wait() {
  return new Promise<void>((resolve) => window.setTimeout(resolve, 450));
}

function toPage(id: string, fileName: string, filter: PreviewFilter, page: number): NamelistPreview {
  const allRows = previews.get(id) ?? [];
  const metadata = previewMetadata.get(id) ?? {
    reportingMonth: new Date().toISOString().slice(0, 7),
    importMode: "live" as const,
  };
  const filtered = allRows.filter((row) => filter === "all" || (filter === "valid" ? row.issues.length === 0 : row.issues.length > 0));
  const validRows = allRows.filter((row) => row.issues.length === 0).length;
  return {
    id,
    fileName,
    reportingMonth: metadata.reportingMonth,
    importMode: metadata.importMode,
    totalRows: allRows.length,
    validRows,
    invalidRows: allRows.length - validRows,
    hasExistingMonthImport: true,
    rows: filtered.slice((page - 1) * pageSize, page * pageSize),
    page,
    pageSize,
    filteredRows: filtered.length,
  };
}

export const mockNamelistImportClient: NamelistImportClient = {
  async createPreview(file, reportingMonth, importMode) {
    await wait();
    const rows = Array.from({ length: 18 }, (_, index) => ({ rowNumber: index + 2, values: makeValues(index + 1), issues: [] }));
    rows[4].values.official_email = "invalid-email";
    rows[7].values.pers_no = rows[6].values.pers_no;
    rows[10].values.joining_date = "03/02/2020";
    const id = crypto.randomUUID();
    previews.set(id, revalidate(rows));
    previewMetadata.set(id, {
      reportingMonth,
      importMode,
    });
    return toPage(id, file.name, "all", 1);
  },
  async getRows(previewId, filter, page) {
    await wait();
    const current = previews.get(previewId);
    if (!current) throw new Error("Preview expired.");
    return toPage(previewId, "monthly-namelist.xlsx", filter, page);
  },
  async updateRow(previewId, updatedRow, filter, page) {
    await wait();
    const current = previews.get(previewId);
    if (!current) throw new Error("Preview expired.");
    previews.set(previewId, revalidate(current.map((row) => row.rowNumber === updatedRow.rowNumber ? updatedRow : row)));
    return toPage(previewId, "monthly-namelist.xlsx", filter, page);
  },
  async cancel(previewId) {
    await wait();
    previews.delete(previewId);
    previewMetadata.delete(previewId);
  },
  async commit(preview, confirmReplacement) {
    await wait();
    if (preview.hasExistingMonthImport && !confirmReplacement) throw new Error("Confirm replacement of this month's import.");
    return { totalRows: preview.totalRows };
  },
};