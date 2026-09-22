"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Employee360Repository = void 0;
const common_1 = require("@nestjs/common");
const database_service_1 = require("../../database/database.service");
function mapDate(value) {
    if (value === null)
        return null;
    if (value instanceof Date)
        return value.toISOString().slice(0, 10);
    return value.slice(0, 10);
}
function mapEmployee(row) {
    return {
        persNo: row.pers_no,
        personnelNumber: row.personnel_number,
        employeeGroup: row.employee_group,
        psGroup: row.ps_group,
        orgUnit: row.organizational_unit,
        range: row.range,
        functionName: row.function_name,
        gender: row.gender_key,
        location: row.location,
        ntId: row.nt_id,
        globalId: row.global_id,
        costCenter: row.cost_center,
        birthDate: mapDate(row.birth_date),
        joiningDate: mapDate(row.joining_date),
        entryForRetirement: mapDate(row.entry_for_retirement),
        designationText: row.designation_text,
        hrbpGlobalId: row.hrbp_global_id,
        hrbp2GlobalId: row.hrbp2_global_id,
        officialEmail: row.official_email,
        technicalEntryDate: mapDate(row.technical_entry_date),
        directOrIndirect: row.direct_or_indirect,
    };
}
const scopedEmployees = `
  SELECT
    e.pers_no,
    e.personnel_number,
    e.employee_group,
    e.ps_group,
    e.organizational_unit,
    e.range,
    e.function,
    e.gender_key,
    e.location,
    e.nt_id,
    e.global_id,
    e.cost_center,
    e.birth_date,
    e.joining_date,
    e.entry_for_retirement,
    e.designation_text,
    e.hrbp_global_id,
    e.hrbp2_global_id,
    e.official_email,
    e.technical_entry_date,
    e.direct_or_indirect
  FROM public.employee_namelist e
  WHERE ($9::BIGINT IS NULL OR e.pers_no <> $9)
    AND ($1::TEXT IS NULL
      OR e.pers_no::TEXT ILIKE '%' || $1 || '%'
      OR e.personnel_number ILIKE '%' || $1 || '%')
    AND EXISTS (
      SELECT 1
      FROM public.master_access access
      WHERE access.account_id = $8::UUID
        AND (
          access.role IN ('hrbp', 'admin')
          OR (access.role = 'range_head'
            AND BTRIM(e.range) = BTRIM(access.assigned_range))
          OR (access.role IN ('department_head', 'sub_department_head')
            AND BTRIM(e.range) = BTRIM(access.assigned_range)
            AND BTRIM(e.organizational_unit) = BTRIM(access.assigned_org_unit))
        )
    )
`;
let Employee360Repository = class Employee360Repository {
    database;
    constructor(database) {
        this.database = database;
    }
    async getEmployees(filters, accountId, persNo) {
        const values = [
            filters.search,
            filters.functionName,
            filters.orgUnit,
            filters.range,
            filters.location,
            filters.gender,
            filters.directOrIndirect,
            accountId,
            persNo,
        ];
        const [employeesResult, optionsResult] = await Promise.all([
            this.database.query(`
        WITH scoped AS (${scopedEmployees})
        SELECT
          pers_no, personnel_number, employee_group, ps_group,
          organizational_unit, range, function AS function_name, gender_key,
          location, nt_id, global_id, cost_center, birth_date, joining_date,
          entry_for_retirement, designation_text, hrbp_global_id,
          hrbp2_global_id, official_email, technical_entry_date,
          direct_or_indirect
        FROM scoped e
        WHERE ($2::TEXT IS NULL OR BTRIM(e.function) = $2)
          AND ($3::TEXT IS NULL OR BTRIM(e.organizational_unit) = $3)
          AND ($4::TEXT IS NULL OR BTRIM(e.range) = $4)
          AND ($5::TEXT IS NULL OR BTRIM(e.location) = $5)
          AND ($6::TEXT IS NULL OR BTRIM(e.gender_key) = $6)
          AND ($7::TEXT IS NULL OR BTRIM(e.direct_or_indirect) = $7)
        ORDER BY e.personnel_number, e.pers_no
      `, values),
            this.database.query(`
        WITH scoped AS (${scopedEmployees})
        SELECT
          ARRAY(SELECT DISTINCT BTRIM(e.function) FROM scoped e
            WHERE NULLIF(BTRIM(e.function), '') IS NOT NULL
              AND ($3::TEXT IS NULL OR BTRIM(e.organizational_unit) = $3)
              AND ($4::TEXT IS NULL OR BTRIM(e.range) = $4)
              AND ($5::TEXT IS NULL OR BTRIM(e.location) = $5)
              AND ($6::TEXT IS NULL OR BTRIM(e.gender_key) = $6)
              AND ($7::TEXT IS NULL OR BTRIM(e.direct_or_indirect) = $7)
            ORDER BY 1) AS "functionName",
          ARRAY(SELECT DISTINCT BTRIM(e.organizational_unit) FROM scoped e
            WHERE NULLIF(BTRIM(e.organizational_unit), '') IS NOT NULL
              AND ($2::TEXT IS NULL OR BTRIM(e.function) = $2)
              AND ($4::TEXT IS NULL OR BTRIM(e.range) = $4)
              AND ($5::TEXT IS NULL OR BTRIM(e.location) = $5)
              AND ($6::TEXT IS NULL OR BTRIM(e.gender_key) = $6)
              AND ($7::TEXT IS NULL OR BTRIM(e.direct_or_indirect) = $7)
            ORDER BY 1) AS "orgUnit",
          ARRAY(SELECT DISTINCT BTRIM(e.range) FROM scoped e
            WHERE NULLIF(BTRIM(e.range), '') IS NOT NULL
              AND ($2::TEXT IS NULL OR BTRIM(e.function) = $2)
              AND ($3::TEXT IS NULL OR BTRIM(e.organizational_unit) = $3)
              AND ($5::TEXT IS NULL OR BTRIM(e.location) = $5)
              AND ($6::TEXT IS NULL OR BTRIM(e.gender_key) = $6)
              AND ($7::TEXT IS NULL OR BTRIM(e.direct_or_indirect) = $7)
            ORDER BY 1) AS range,
          ARRAY(SELECT DISTINCT BTRIM(e.location) FROM scoped e
            WHERE NULLIF(BTRIM(e.location), '') IS NOT NULL
              AND ($2::TEXT IS NULL OR BTRIM(e.function) = $2)
              AND ($3::TEXT IS NULL OR BTRIM(e.organizational_unit) = $3)
              AND ($4::TEXT IS NULL OR BTRIM(e.range) = $4)
              AND ($6::TEXT IS NULL OR BTRIM(e.gender_key) = $6)
              AND ($7::TEXT IS NULL OR BTRIM(e.direct_or_indirect) = $7)
            ORDER BY 1) AS location,
          ARRAY(SELECT DISTINCT BTRIM(e.gender_key) FROM scoped e
            WHERE NULLIF(BTRIM(e.gender_key), '') IS NOT NULL
              AND ($2::TEXT IS NULL OR BTRIM(e.function) = $2)
              AND ($3::TEXT IS NULL OR BTRIM(e.organizational_unit) = $3)
              AND ($4::TEXT IS NULL OR BTRIM(e.range) = $4)
              AND ($5::TEXT IS NULL OR BTRIM(e.location) = $5)
              AND ($7::TEXT IS NULL OR BTRIM(e.direct_or_indirect) = $7)
            ORDER BY 1) AS gender,
          ARRAY(SELECT DISTINCT BTRIM(e.direct_or_indirect) FROM scoped e
            WHERE NULLIF(BTRIM(e.direct_or_indirect), '') IS NOT NULL
              AND ($2::TEXT IS NULL OR BTRIM(e.function) = $2)
              AND ($3::TEXT IS NULL OR BTRIM(e.organizational_unit) = $3)
              AND ($4::TEXT IS NULL OR BTRIM(e.range) = $4)
              AND ($5::TEXT IS NULL OR BTRIM(e.location) = $5)
              AND ($6::TEXT IS NULL OR BTRIM(e.gender_key) = $6)
            ORDER BY 1) AS "directOrIndirect"
      `, values),
        ]);
        return {
            employees: employeesResult.rows.map(mapEmployee),
            filterOptions: optionsResult.rows[0] ?? {
                functionName: [], orgUnit: [], range: [], location: [], gender: [], directOrIndirect: [],
            },
        };
    }
};
exports.Employee360Repository = Employee360Repository;
exports.Employee360Repository = Employee360Repository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], Employee360Repository);
//# sourceMappingURL=employee-360.repository.js.map