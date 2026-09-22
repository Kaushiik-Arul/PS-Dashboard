import { BadRequestException, Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import type {
  Employee360QueryDto,
  Employee360ResponseDto,
  NormalizedEmployee360Query,
} from './dto/employee-360.dto';
import { Employee360Repository } from './employee-360.repository';

@Injectable()
export class Employee360Service {
  constructor(private readonly repository: Employee360Repository) {}

  getEmployees(
    input: Employee360QueryDto,
    user: AuthenticatedUser,
  ): Promise<Employee360ResponseDto> {
    return this.repository.getEmployees(
      this.normalize(input),
      user.accountId,
      user.persNo,
    );
  }

  private normalize(input: Employee360QueryDto): NormalizedEmployee360Query {
    const value = (item: unknown, label: string, maxLength = 200) => {
      if (item === undefined || item === '') return null;
      if (typeof item !== 'string' || item.length > maxLength) {
        throw new BadRequestException(`${label} is invalid`);
      }
      return item.trim() || null;
    };
    return {
      search: value(input.search, 'Search', 100),
      functionName: value(input.functionName, 'Function filter'),
      orgUnit: value(input.orgUnit, 'Organizational unit filter'),
      range: value(input.range, 'Range filter'),
      location: value(input.location, 'Location filter'),
      gender: value(input.gender, 'Gender filter'),
      directOrIndirect: value(input.directOrIndirect, 'Direct or indirect filter'),
    };
  }
}