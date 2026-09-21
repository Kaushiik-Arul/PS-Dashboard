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
exports.HrbpPointRepository = void 0;
const common_1 = require("@nestjs/common");
const database_service_1 = require("../../database/database.service");
function mapDate(value) {
    if (value === null)
        return null;
    if (value instanceof Date)
        return value.toISOString().slice(0, 10);
    return value.slice(0, 10);
}
function mapEmployeeStatus(row) {
    return {
        persNo: row.pers_no,
        statusType: row.status_type,
        startDate: mapDate(row.start_date),
        endDate: mapDate(row.end_date),
        updatedAt: row.updated_at instanceof Date
            ? row.updated_at.toISOString()
            : new Date(row.updated_at).toISOString(),
        updatedBy: row.updated_by,
    };
}
const returningColumns = `
  pers_no, status_type, start_date, end_date, updated_at, updated_by
`;
let HrbpPointRepository = class HrbpPointRepository {
    database;
    constructor(database) {
        this.database = database;
    }
    async getEmployeeStatuses() {
        const result = await this.database.query(`
      SELECT ${returningColumns}
      FROM public.employee_status
      ORDER BY pers_no;
    `);
        return result.rows.map(mapEmployeeStatus);
    }
    async employeeExists(persNo) {
        const result = await this.database.query(`SELECT EXISTS (
        SELECT 1 FROM public.employee_namelist WHERE pers_no = $1
      ) AS exists;`, [persNo]);
        return result.rows[0]?.exists ?? false;
    }
    async createEmployeeStatus(persNo, values) {
        const result = await this.database.query(`INSERT INTO public.employee_status (
        pers_no, status_type, start_date, end_date, updated_by
      ) VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (pers_no) DO NOTHING
      RETURNING ${returningColumns};`, [
            persNo,
            values.statusType,
            values.startDate,
            values.endDate,
            values.updatedBy,
        ]);
        return result.rows[0] ? mapEmployeeStatus(result.rows[0]) : null;
    }
    async updateEmployeeStatus(persNo, values) {
        const result = await this.database.query(`UPDATE public.employee_status
      SET status_type = $2,
          start_date = $3,
          end_date = $4,
          updated_at = CURRENT_TIMESTAMP,
          updated_by = $5
      WHERE pers_no = $1
      RETURNING ${returningColumns};`, [
            persNo,
            values.statusType,
            values.startDate,
            values.endDate,
            values.updatedBy,
        ]);
        return result.rows[0] ? mapEmployeeStatus(result.rows[0]) : null;
    }
    async deleteEmployeeStatus(persNo) {
        const result = await this.database.query('DELETE FROM public.employee_status WHERE pers_no = $1;', [persNo]);
        return (result.rowCount ?? 0) > 0;
    }
};
exports.HrbpPointRepository = HrbpPointRepository;
exports.HrbpPointRepository = HrbpPointRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], HrbpPointRepository);
//# sourceMappingURL=hrbp-point.repository.js.map