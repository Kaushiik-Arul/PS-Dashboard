import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import type {
  EmployeeStatusResponseDto,
  EmployeeStatusType,
} from './dto/employee-status.dto';

type EmployeeStatusRow = {
  pers_no: string;
  status_type: EmployeeStatusType;
  start_date: Date | string | null;
  end_date: Date | string | null;
  updated_at: Date | string;
  updated_by: string;
};

type EmployeeStatusValues = {
  statusType: EmployeeStatusType;
  startDate: string | null;
  endDate: string | null;
  updatedBy: string;
};

function mapDate(value: Date | string | null): string | null {
  if (value === null) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return value.slice(0, 10);
}

function mapEmployeeStatus(row: EmployeeStatusRow): EmployeeStatusResponseDto {
  return {
    persNo: row.pers_no,
    statusType: row.status_type,
    startDate: mapDate(row.start_date),
    endDate: mapDate(row.end_date),
    updatedAt:
      row.updated_at instanceof Date
        ? row.updated_at.toISOString()
        : new Date(row.updated_at).toISOString(),
    updatedBy: row.updated_by,
  };
}

const returningColumns = `
  pers_no, status_type, start_date, end_date, updated_at, updated_by
`;

@Injectable()
export class HrbpPointRepository {
  constructor(private readonly database: DatabaseService) {}

  async getEmployeeStatuses(): Promise<EmployeeStatusResponseDto[]> {
    const result = await this.database.query<EmployeeStatusRow>(`
      SELECT ${returningColumns}
      FROM public.employee_status
      ORDER BY pers_no;
    `);

    return result.rows.map(mapEmployeeStatus);
  }

  async employeeExists(persNo: string): Promise<boolean> {
    const result = await this.database.query<{ exists: boolean }>(
      `SELECT EXISTS (
        SELECT 1 FROM public.employee_namelist WHERE pers_no = $1
      ) AS exists;`,
      [persNo],
    );

    return result.rows[0]?.exists ?? false;
  }

  async createEmployeeStatus(
    persNo: string,
    values: EmployeeStatusValues,
  ): Promise<EmployeeStatusResponseDto | null> {
    const result = await this.database.query<EmployeeStatusRow>(
      `INSERT INTO public.employee_status (
        pers_no, status_type, start_date, end_date, updated_by
      ) VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (pers_no) DO NOTHING
      RETURNING ${returningColumns};`,
      [
        persNo,
        values.statusType,
        values.startDate,
        values.endDate,
        values.updatedBy,
      ],
    );

    return result.rows[0] ? mapEmployeeStatus(result.rows[0]) : null;
  }

  async updateEmployeeStatus(
    persNo: string,
    values: EmployeeStatusValues,
  ): Promise<EmployeeStatusResponseDto | null> {
    const result = await this.database.query<EmployeeStatusRow>(
      `UPDATE public.employee_status
      SET status_type = $2,
          start_date = $3,
          end_date = $4,
          updated_at = CURRENT_TIMESTAMP,
          updated_by = $5
      WHERE pers_no = $1
      RETURNING ${returningColumns};`,
      [
        persNo,
        values.statusType,
        values.startDate,
        values.endDate,
        values.updatedBy,
      ],
    );

    return result.rows[0] ? mapEmployeeStatus(result.rows[0]) : null;
  }

  async deleteEmployeeStatus(persNo: string): Promise<boolean> {
    const result = await this.database.query(
      'DELETE FROM public.employee_status WHERE pers_no = $1;',
      [persNo],
    );

    return (result.rowCount ?? 0) > 0;
  }
}