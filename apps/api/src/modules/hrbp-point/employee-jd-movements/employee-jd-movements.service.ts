import { BadRequestException, Injectable } from '@nestjs/common';
import { EmployeeJdMovementsRepository } from './employee-jd-movements.repository';

@Injectable()
export class EmployeeJdMovementsService {
  constructor(private readonly repository: EmployeeJdMovementsRepository) {}

  list(search?: string, source?: string, fromDate?: string, toDate?: string, role?: string, pageInput?: string, pageSizeInput?: string) {
    const normalizedSource = source?.trim() ?? '';
    if (normalizedSource !== '' && normalizedSource !== 'upload' && normalizedSource !== 'manual') {
      throw new BadRequestException('Source must be upload or manual.');
    }
    const normalizedSearch = search?.trim() ?? '';
    const normalizedRole = role?.trim() ?? '';
    if (normalizedSearch.length > 100 || normalizedRole.length > 200) {
      throw new BadRequestException('Movement filters are too long.');
    }
    const normalizedFrom = this.date(fromDate, 'From date');
    const normalizedTo = this.date(toDate, 'To date');
    if (normalizedFrom && normalizedTo && normalizedFrom > normalizedTo) {
      throw new BadRequestException('From date must be on or before To date.');
    }
    return this.repository.list({
      search: normalizedSearch,
      source: normalizedSource,
      fromDate: normalizedFrom,
      toDate: normalizedTo,
      role: normalizedRole,
    }, this.positiveInteger(pageInput, 1, 1_000_000), this.positiveInteger(pageSizeInput, 25, 100));
  }

  private date(value: string | undefined, label: string): string | null {
    if (!value) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new BadRequestException(`${label} is invalid.`);
    const parsed = new Date(`${value}T00:00:00Z`);
    if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
      throw new BadRequestException(`${label} is invalid.`);
    }
    return value;
  }

  private positiveInteger(value: string | undefined, fallback: number, maximum: number): number {
    if (value === undefined) return fallback;
    if (!/^\d+$/.test(value)) throw new BadRequestException('Pagination values must be positive whole numbers.');
    const parsed = Number(value);
    if (parsed < 1 || parsed > maximum) throw new BadRequestException(`Pagination value must be between 1 and ${maximum}.`);
    return parsed;
  }
}