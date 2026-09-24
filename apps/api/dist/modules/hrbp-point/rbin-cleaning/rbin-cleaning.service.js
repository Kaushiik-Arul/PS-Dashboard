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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var RbinCleaningService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RbinCleaningService = void 0;
const common_1 = require("@nestjs/common");
const exceljs_1 = __importDefault(require("exceljs"));
const namelist_import_types_1 = require("../namelist-import/namelist-import.types");
const rbin_cleaning_parser_1 = require("./rbin-cleaning.parser");
const rbin_cleaning_repository_1 = require("./rbin-cleaning.repository");
const rbin_cleaning_transformer_1 = require("./rbin-cleaning.transformer");
const exportHeaders = {
    pers_no: 'Pers.No.',
    personnel_number: 'Personnel Number',
    employee_group: 'Employee Group',
    lp: 'LP',
    esgrp: 'ESgrp',
    employee_subgroup: 'Employee Subgroup',
    ps_group: 'PS group',
    organizational_unit: 'Organizational Unit',
    range: 'Range',
    function: 'Function',
    organisational_area_pa: 'Organisational Area(PA)',
    gender_key: 'Gender Key',
    location: 'Location',
    pa: 'PA',
    personnel_area: 'Personnel Area',
    psubarea: 'PSubarea',
    personnel_subarea: 'Personnel Subarea',
    nt_id: 'NT_ID',
    global_id: 'Global ID',
    cost_center: 'Cost Ctr',
    birth_date: 'Birth date',
    joining_date: 'Date of Joining',
    entry_for_retirement: 'Entry for Retirement',
    designation_text: 'Designation Text',
    hrbp_global_id: 'Global-Id of HRBP',
    hrbp2_global_id: 'Global-Id of HRBP2',
    official_email: 'Email Official',
    technical_entry_date: 'Technical Entry Date',
    direct_or_indirect: 'Direct or Indirect',
};
let RbinCleaningService = RbinCleaningService_1 = class RbinCleaningService {
    repository;
    logger = new common_1.Logger(RbinCleaningService_1.name);
    constructor(repository) {
        this.repository = repository;
    }
    async createPreview(file, actorAccountId) {
        if (!file)
            throw new common_1.BadRequestException('A CSV or XLSX file is required.');
        let rawRows;
        try {
            rawRows = await (0, rbin_cleaning_parser_1.parseRbinFile)(file);
        }
        catch (error) {
            if (error instanceof common_1.HttpException)
                throw error;
            throw new common_1.BadRequestException('The uploaded RBIN file could not be parsed.');
        }
        return this.runDatabaseOperation(async () => {
            const mappings = await this.repository.getMappings();
            const persNos = [...new Set(rawRows
                    .map((row) => row.values.pers_no.trim())
                    .filter(this.isPostgresBigInt))];
            const [baselines, exceptions] = await Promise.all([
                this.repository.getBaselines(persNos),
                this.repository.getExceptions(persNos),
            ]);
            const stagedRows = (0, rbin_cleaning_transformer_1.transformRbinRows)(rawRows, mappings, baselines, exceptions);
            const batchId = await this.repository.createBatch(actorAccountId, file, rawRows, stagedRows);
            const summary = await this.repository.getSummary(batchId, actorAccountId);
            if (!summary)
                throw new Error('BATCH_NOT_FOUND');
            return summary;
        }, 'Unable to create RBIN cleaning batch');
    }
    listBatches(actorAccountId) {
        return this.runDatabaseOperation(() => this.repository.listBatches(actorAccountId), 'Unable to list RBIN cleaning batches');
    }
    async getRows(batchId, actorAccountId, filterInput, pageInput, pageSizeInput, searchInput, viewInput) {
        const allowedFilters = ['all', 'valid', 'invalid', 'new', 'changed', 'unchanged'];
        const filter = allowedFilters.includes(filterInput)
            ? filterInput
            : 'all';
        const page = this.positiveInteger(pageInput, 1, 1_000_000);
        const pageSize = this.positiveInteger(pageSizeInput, 25, 100);
        const search = searchInput?.trim() ?? '';
        const view = viewInput === 'key' ? 'key' : 'all';
        if (search.length > 100)
            throw new common_1.BadRequestException('Search must not exceed 100 characters.');
        return this.runDatabaseOperation(async () => {
            const result = await this.repository.getRows(batchId, actorAccountId, filter, page, pageSize, search, view);
            if (!result)
                throw new common_1.NotFoundException('RBIN cleaning batch was not found.');
            return result;
        }, 'Unable to load RBIN cleaning rows');
    }
    async updateRow(batchId, rowNumberInput, input, actorAccountId) {
        const rowNumber = this.positiveInteger(rowNumberInput, 0, 2_147_483_647);
        const values = this.validateRowInput(input);
        return this.runDatabaseOperation(async () => {
            const rows = await this.repository.getAllRows(batchId, actorAccountId);
            if (!rows)
                throw new common_1.NotFoundException('RBIN cleaning batch was not found.');
            const target = rows.find((row) => row.rowNumber === rowNumber);
            if (!target)
                throw new common_1.NotFoundException('RBIN staged row was not found.');
            const persNoChanged = target.values.pers_no !== values.pers_no;
            target.values = values;
            target.rangeSource = values.range === target.originalValues.range ? target.rangeSource : 'manual';
            target.functionSource = values.function === target.originalValues.function ? target.functionSource : 'manual';
            if (!values.range)
                target.rangeSource = 'missing';
            if (!values.function)
                target.functionSource = 'missing';
            if (persNoChanged) {
                const baselines = this.isPostgresBigInt(values.pers_no)
                    ? await this.repository.getBaselines([values.pers_no])
                    : new Map();
                target.baselineValues = baselines.get(values.pers_no) ?? null;
            }
            rows.forEach((row) => {
                row.issues = (0, rbin_cleaning_transformer_1.validateRbinStagedValues)(row.values);
                Object.assign(row, (0, rbin_cleaning_transformer_1.compareWithBaseline)(row.values, row.baselineValues));
            });
            (0, rbin_cleaning_transformer_1.applyDuplicateIssues)(rows);
            await this.repository.updateRows(batchId, actorAccountId, rows);
            const summary = await this.repository.getSummary(batchId, actorAccountId);
            if (!summary)
                throw new Error('BATCH_NOT_FOUND');
            return summary;
        }, 'Unable to update RBIN staged row');
    }
    async finalize(batchId, actorAccountId) {
        return this.runDatabaseOperation(async () => {
            await this.repository.finalize(batchId, actorAccountId);
            const summary = await this.repository.getSummary(batchId, actorAccountId);
            if (!summary)
                throw new Error('BATCH_NOT_FOUND');
            return summary;
        }, 'Unable to finalize RBIN cleaning batch');
    }
    async exportBatch(batchId, actorAccountId) {
        return this.runDatabaseOperation(async () => {
            const rows = await this.repository.getExportRows(batchId, actorAccountId);
            if (!rows)
                throw new Error('BATCH_NOT_EXPORTABLE');
            const workbook = new exceljs_1.default.Workbook();
            workbook.creator = 'PS Dashboard';
            workbook.created = new Date();
            const sheet = workbook.addWorksheet('PS Namelist', {
                views: [{ state: 'frozen', ySplit: 1 }],
            });
            sheet.columns = namelist_import_types_1.namelistColumns.map((column) => ({
                header: exportHeaders[column],
                key: column,
                width: Math.max(14, exportHeaders[column].length + 2),
            }));
            sheet.getRow(1).font = { bold: true };
            rows.forEach((row) => {
                const excelRow = sheet.addRow(row);
                ['pers_no', 'global_id', 'hrbp_global_id', 'hrbp2_global_id'].forEach((column) => {
                    excelRow.getCell(namelist_import_types_1.namelistColumns.indexOf(column) + 1).numFmt = '@';
                });
            });
            sheet.autoFilter = { from: 'A1', to: `${sheet.getColumn(namelist_import_types_1.namelistColumns.length).letter}1` };
            const excelBuffer = await workbook.xlsx.writeBuffer();
            const buffer = Buffer.from(excelBuffer);
            const fileName = `PS_Namelist_Cleaned_${new Date().toISOString().slice(0, 10)}.xlsx`;
            await this.repository.recordExport(batchId, actorAccountId, fileName, rows.length, buffer);
            return { fileName, buffer };
        }, 'Unable to export RBIN cleaning batch');
    }
    validateRowInput(input) {
        if (typeof input !== 'object' || input === null || Array.isArray(input)) {
            throw new common_1.BadRequestException('Row values are required.');
        }
        const record = input;
        const keys = Object.keys(record);
        if (keys.length !== namelist_import_types_1.namelistColumns.length || keys.some((key) => !namelist_import_types_1.namelistColumns.includes(key))) {
            throw new common_1.BadRequestException('Row values must contain exactly the employee namelist columns.');
        }
        const values = {};
        for (const column of namelist_import_types_1.namelistColumns) {
            if (typeof record[column] !== 'string')
                throw new common_1.BadRequestException(`${column} must be text.`);
            values[column] = record[column].trim();
        }
        return values;
    }
    positiveInteger(value, fallback, maximum) {
        if (value === undefined)
            return fallback;
        if (!/^\d+$/.test(value))
            throw new common_1.BadRequestException('Pagination values must be positive whole numbers.');
        const parsed = Number(value);
        if (parsed < 1 || parsed > maximum) {
            throw new common_1.BadRequestException(`Pagination value must be between 1 and ${maximum}.`);
        }
        return parsed;
    }
    isPostgresBigInt = (value) => {
        if (!/^[1-9]\d*$/.test(value))
            return false;
        try {
            return BigInt(value) <= 9223372036854775807n;
        }
        catch {
            return false;
        }
    };
    async runDatabaseOperation(operation, publicMessage) {
        try {
            return await operation();
        }
        catch (error) {
            if (error instanceof common_1.HttpException)
                throw error;
            if (error instanceof Error) {
                if (error.message === 'BATCH_NOT_FOUND')
                    throw new common_1.NotFoundException('RBIN cleaning batch was not found.');
                if (error.message === 'BATCH_NOT_EDITABLE')
                    throw new common_1.ConflictException('Only a draft RBIN batch can be edited.');
                if (error.message === 'BATCH_NOT_EXPORTABLE')
                    throw new common_1.ConflictException('Save the cleaned dataset before export.');
                if (error.message === 'INVALID_ROWS')
                    throw new common_1.ConflictException('Resolve every invalid row before saving the cleaned dataset.');
            }
            this.logger.error(publicMessage);
            throw new common_1.InternalServerErrorException(publicMessage);
        }
    }
};
exports.RbinCleaningService = RbinCleaningService;
exports.RbinCleaningService = RbinCleaningService = RbinCleaningService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [rbin_cleaning_repository_1.RbinCleaningRepository])
], RbinCleaningService);
//# sourceMappingURL=rbin-cleaning.service.js.map